import { useState, useRef, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { alert } from '@/shared/utils/alert';
import { Audio } from 'expo-av';
import * as Device from 'expo-device';

export interface UseVoiceRecorderReturn {
  isRecording: boolean;
  durationMs: number;
  metering: number; // normalized 0..1 (0 = silent, 1 = max)
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<{ uri: string; durationMs: number } | null>; // returns local file URI + duration or null
  cancelRecording: () => Promise<void>;
  getMimeType: () => string;
}

// Custom options — explicitly produces .m4a on both platforms.
// The HIGH_QUALITY preset uses .caf on iOS (Apple Lossless), causing a
// mimeType mismatch and audio-session conflicts with VoiceNotePlayer.
const NATIVE_RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: true,
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

const WEB_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/ogg',
];

function pickWebMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const c of WEB_MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c;
    } catch {
      // isTypeSupported can throw on some older browsers — keep trying.
    }
  }
  return '';
}

function describeError(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  return String(err);
}

// Normalize dB metering (-60..0) to 0..1. Values below -60 are considered silent.
function normalizeMeteringDb(db: number): number {
  return Math.max(0, Math.min(1, (db + 60) / 60));
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [metering, setMetering] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationMsRef = useRef(0);

  // Native refs (expo-av)
  const recordingRef = useRef<Audio.Recording | null>(null);

  // Web refs (MediaRecorder)
  const webRecorderRef = useRef<MediaRecorder | null>(null);
  const webChunksRef = useRef<Blob[]>([]);
  const webStreamRef = useRef<MediaStream | null>(null);

  // Remembers the mime type actually used so ChatScreen can upload with the
  // right Content-Type. Always 'audio/m4a' on native (matches NATIVE_RECORDING_OPTIONS).
  const mimeTypeRef = useRef<string>(Platform.OS === 'web' ? 'audio/webm' : 'audio/m4a');

  // Generation counter — bumped by stop/cancel so an in-flight startRecording
  // can detect it was superseded before it finishes.
  const genRef = useRef(0);

  useEffect(() => { durationMsRef.current = durationMs; }, [durationMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (Platform.OS === 'web') {
        webStreamRef.current?.getTracks().forEach(t => t.stop());
      } else {
        recordingRef.current?.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  const startRecording = useCallback(async (): Promise<boolean> => {
    const gen = ++genRef.current;

    if (Platform.OS === 'web') {
      if (!navigator?.mediaDevices?.getUserMedia) {
        alert(
          'Microphone unavailable',
          'navigator.mediaDevices is undefined. Voice recording requires a secure origin (localhost or HTTPS).',
        );
        return false;
      }
      if (typeof MediaRecorder === 'undefined') {
        alert('Unsupported browser', 'MediaRecorder is not available in this browser.');
        return false;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        setIsRecording(false);
        if (err instanceof Error && err.name === 'NotAllowedError') {
          alert(
            'Microphone Access Required',
            'Please allow microphone access in your browser to send voice messages.',
          );
        } else {
          alert('Microphone error', describeError(err));
        }
        return false;
      }

      if (gen !== genRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return false;
      }

      const chosenMime = pickWebMimeType();
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = chosenMime
          ? new MediaRecorder(stream, { mimeType: chosenMime })
          : new MediaRecorder(stream);
      } catch (err) {
        stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
        alert('Recorder unavailable', `Could not create audio recorder: ${describeError(err)}`);
        return false;
      }

      webStreamRef.current = stream;
      webRecorderRef.current = mediaRecorder;
      webChunksRef.current = [];
      mimeTypeRef.current = mediaRecorder.mimeType || chosenMime || 'audio/webm';

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) webChunksRef.current.push(e.data);
      };

      try {
        mediaRecorder.start();
      } catch (err) {
        stream.getTracks().forEach(t => t.stop());
        webRecorderRef.current = null;
        webStreamRef.current = null;
        setIsRecording(false);
        alert('Recorder failed to start', describeError(err));
        return false;
      }

      setDurationMs(0);
      setMetering(0);
      setIsRecording(true);
      timerRef.current = setInterval(() => setDurationMs((d) => d + 100), 100);
      return true;
    }

    // ── Native (expo-av) ────────────────────────────────────────────────────
    try {
      // iOS simulator has no microphone hardware — AVAudioRecorder always fails there.
      if (__DEV__ && Platform.OS === 'ios' && !Device.isDevice) {
        alert(
          'Simulator limitation',
          'Audio recording is not supported on the iOS simulator. Please test on a real device.',
        );
        return false;
      }

      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        alert('Microphone Access Required', 'Please enable microphone access in Settings to send voice messages.');
        return false;
      }
      if (gen !== genRef.current) return false;

      // Force-stop any stale recording (e.g. from a previous session that
      // didn't clean up properly) before touching the audio session.
      if (recordingRef.current) {
        try { await recordingRef.current.stopAndUnloadAsync(); } catch {}
        recordingRef.current = null;
      }

      // Reset audio mode first so any active playback session (VoiceNotePlayer)
      // releases its hold, then re-arm for recording. Without the reset, iOS
      // AVAudioRecorder.prepareToRecord returns NO → "recorder not prepared".
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      if (gen !== genRef.current) return false;

      const recording = new Audio.Recording();

      // Subscribe to status updates for metering
      recording.setOnRecordingStatusUpdate((status) => {
        if (!status.isRecording) return;
        if (status.metering !== undefined && status.metering !== null) {
          setMetering(normalizeMeteringDb(status.metering));
        }
      });

      await recording.prepareToRecordAsync(NATIVE_RECORDING_OPTIONS);

      if (gen !== genRef.current) {
        recording.stopAndUnloadAsync().catch(() => {});
        return false;
      }

      await recording.startAsync();

      recordingRef.current = recording;
      mimeTypeRef.current = 'audio/m4a'; // matches the .m4a in NATIVE_RECORDING_OPTIONS
      setDurationMs(0);
      setMetering(0);
      setIsRecording(true);

      timerRef.current = setInterval(() => setDurationMs((d) => d + 100), 100);
      return true;
    } catch (err) {
      setIsRecording(false);
      alert('Recording failed', describeError(err));
      return false;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<{ uri: string; durationMs: number } | null> => {
    const capturedDuration = durationMsRef.current;
    genRef.current++;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setIsRecording(false);
    setMetering(0);

    if (Platform.OS === 'web') {
      const mediaRecorder = webRecorderRef.current;
      webRecorderRef.current = null;
      if (!mediaRecorder || mediaRecorder.state === 'inactive') return null;

      return new Promise((resolve) => {
        mediaRecorder.onstop = () => {
          const blob = new Blob(webChunksRef.current, { type: mimeTypeRef.current || 'audio/webm' });
          webChunksRef.current = [];
          webStreamRef.current?.getTracks().forEach(t => t.stop());
          webStreamRef.current = null;
          resolve({ uri: URL.createObjectURL(blob), durationMs: capturedDuration });
        };
        mediaRecorder.stop();
      });
    } else {
      const recording = recordingRef.current;
      recordingRef.current = null;
      if (!recording) return null;

      try {
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        const uri = recording.getURI();
        if (!uri) return null;
        return { uri, durationMs: capturedDuration };
      } catch {
        return null;
      }
    }
  }, []);

  const cancelRecording = useCallback(async () => {
    genRef.current++;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setIsRecording(false);
    setDurationMs(0);
    setMetering(0);

    if (Platform.OS === 'web') {
      const mediaRecorder = webRecorderRef.current;
      webRecorderRef.current = null;
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.ondataavailable = null;
        mediaRecorder.onstop = null;
        mediaRecorder.stop();
      }
      webChunksRef.current = [];
      webStreamRef.current?.getTracks().forEach(t => t.stop());
      webStreamRef.current = null;
    } else {
      const recording = recordingRef.current;
      recordingRef.current = null;
      if (recording) {
        await recording.stopAndUnloadAsync().catch(() => {});
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
      }
    }
  }, []);

  const getMimeType = useCallback(() => mimeTypeRef.current, []);

  return { isRecording, durationMs, metering, startRecording, stopRecording, cancelRecording, getMimeType };
}

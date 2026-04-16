import { useState, useRef, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { alert } from '@/shared/utils/alert';
import {
  useAudioRecorder,
  useAudioRecorderState,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
  AudioQuality,
  IOSOutputFormat,
  type RecordingOptions,
} from 'expo-audio';
import * as Device from 'expo-device';

export interface UseVoiceRecorderReturn {
  isRecording: boolean;
  durationMs: number;
  metering: number; // normalized 0..1 (0 = silent, 1 = max)
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<{ uri: string; durationMs: number } | null>;
  cancelRecording: () => Promise<void>;
  getMimeType: () => string;
}

// Explicitly produces .m4a on both platforms and forces mono for smaller voice files.
// RecordingPresets.HIGH_QUALITY is stereo (2 channels) — not needed for speech.
const NATIVE_RECORDING_OPTIONS: RecordingOptions = {
  isMeteringEnabled: true,
  extension: '.m4a',
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 128000,
  android: {
    extension: '.m4a',
    outputFormat: 'mpeg4',
    audioEncoder: 'aac',
  },
  ios: {
    extension: '.m4a',
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.HIGH,
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
  // Native recorder — always created (hook rules). On web, its state is ignored
  // in favor of the web-branch local state below.
  const recorder = useAudioRecorder(NATIVE_RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 100);

  // Web-only state (native reads from recorderState)
  const [webIsRecording, setWebIsRecording] = useState(false);
  const [webDurationMs, setWebDurationMs] = useState(0);
  const webTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationMsRef = useRef(0);

  const webRecorderRef = useRef<MediaRecorder | null>(null);
  const webChunksRef = useRef<Blob[]>([]);
  const webStreamRef = useRef<MediaStream | null>(null);

  // Always 'audio/m4a' on native (matches NATIVE_RECORDING_OPTIONS).
  const mimeTypeRef = useRef<string>(Platform.OS === 'web' ? 'audio/webm' : 'audio/m4a');

  // Generation counter — bumped by stop/cancel so an in-flight startRecording
  // can detect it was superseded before it finishes.
  const genRef = useRef(0);

  const isRecording = Platform.OS === 'web' ? webIsRecording : recorderState.isRecording;
  const durationMs = Platform.OS === 'web' ? webDurationMs : recorderState.durationMillis;
  const metering = Platform.OS === 'web'
    ? 0
    : (typeof recorderState.metering === 'number' ? normalizeMeteringDb(recorderState.metering) : 0);

  useEffect(() => { durationMsRef.current = durationMs; }, [durationMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (webTimerRef.current) clearInterval(webTimerRef.current);
      if (Platform.OS === 'web') {
        webStreamRef.current?.getTracks().forEach(t => t.stop());
      }
      // Native recorder is auto-released by useAudioRecorder on unmount.
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
        setWebIsRecording(false);
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
        setWebIsRecording(false);
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
        setWebIsRecording(false);
        alert('Recorder failed to start', describeError(err));
        return false;
      }

      setWebDurationMs(0);
      setWebIsRecording(true);
      webTimerRef.current = setInterval(() => setWebDurationMs((d) => d + 100), 100);
      return true;
    }

    // ── Native (expo-audio) ────────────────────────────────────────────────
    try {
      // iOS simulator has no microphone hardware.
      if (__DEV__ && Platform.OS === 'ios' && !Device.isDevice) {
        alert(
          'Simulator limitation',
          'Audio recording is not supported on the iOS simulator. Please test on a real device.',
        );
        return false;
      }

      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        alert('Microphone Access Required', 'Please enable microphone access in Settings to send voice messages.');
        return false;
      }
      if (gen !== genRef.current) return false;

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false,
      });
      if (gen !== genRef.current) return false;

      await recorder.prepareToRecordAsync();
      if (gen !== genRef.current) return false;

      recorder.record();
      mimeTypeRef.current = 'audio/m4a';
      return true;
    } catch (err) {
      alert('Recording failed', describeError(err));
      return false;
    }
  }, [recorder]);

  const stopRecording = useCallback(async (): Promise<{ uri: string; durationMs: number } | null> => {
    const capturedDuration = durationMsRef.current;
    genRef.current++;

    if (Platform.OS === 'web') {
      if (webTimerRef.current) { clearInterval(webTimerRef.current); webTimerRef.current = null; }
      setWebIsRecording(false);
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
    }

    // Native — expo-audio releases the session when .stop() completes.
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) return null;
      return { uri, durationMs: capturedDuration };
    } catch {
      return null;
    }
  }, [recorder]);

  const cancelRecording = useCallback(async () => {
    genRef.current++;

    if (Platform.OS === 'web') {
      if (webTimerRef.current) { clearInterval(webTimerRef.current); webTimerRef.current = null; }
      setWebIsRecording(false);
      setWebDurationMs(0);
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
      await recorder.stop().catch(() => {});
    }
  }, [recorder]);

  const getMimeType = useCallback(() => mimeTypeRef.current, []);

  return { isRecording, durationMs, metering, startRecording, stopRecording, cancelRecording, getMimeType };
}

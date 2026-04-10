import { useState, useRef, useCallback, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { Audio } from 'expo-av';

export interface UseVoiceRecorderReturn {
  isRecording: boolean;
  durationMs: number;
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<string | null>; // returns local file URI or null
  cancelRecording: () => Promise<void>;
  getMimeType: () => string;
}

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

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Native refs (expo-av)
  const recordingRef = useRef<Audio.Recording | null>(null);

  // Web refs (MediaRecorder)
  const webRecorderRef = useRef<MediaRecorder | null>(null);
  const webChunksRef = useRef<Blob[]>([]);
  const webStreamRef = useRef<MediaStream | null>(null);

  // Remembers the mime type the browser actually chose, so stopRecording can
  // build a Blob of the correct type and ChatScreen can upload with the right
  // Content-Type. Defaults to audio/webm (web) / audio/m4a (native).
  const mimeTypeRef = useRef<string>(Platform.OS === 'web' ? 'audio/webm' : 'audio/m4a');

  // Generation counter — bumped by stop/cancel so an in-flight startRecording
  // (e.g. waiting on the browser mic-permission prompt) can detect it was
  // superseded before it finishes initializing the underlying recorder.
  const genRef = useRef(0);

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
        console.error('[useVoiceRecorder] navigator.mediaDevices.getUserMedia is not available');
        Alert.alert(
          'Microphone unavailable',
          'navigator.mediaDevices is undefined. Voice recording requires a secure origin (localhost or HTTPS).',
        );
        return false;
      }
      if (typeof MediaRecorder === 'undefined') {
        console.error('[useVoiceRecorder] MediaRecorder API not available');
        Alert.alert('Unsupported browser', 'MediaRecorder is not available in this browser.');
        return false;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.error('[useVoiceRecorder] getUserMedia failed', err);
        setIsRecording(false);
        if (err instanceof Error && err.name === 'NotAllowedError') {
          Alert.alert(
            'Microphone Access Required',
            'Please allow microphone access in your browser to send voice messages.',
          );
        } else {
          Alert.alert('Microphone error', describeError(err));
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
        mediaRecorder = chosenMime ? new MediaRecorder(stream, { mimeType: chosenMime }) : new MediaRecorder(stream);
      } catch (err) {
        console.error('[useVoiceRecorder] MediaRecorder constructor failed', err, 'chosenMime:', chosenMime);
        stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
        Alert.alert('Recorder unavailable', `Could not create audio recorder: ${describeError(err)}`);
        return false;
      }

      webStreamRef.current = stream;
      webRecorderRef.current = mediaRecorder;
      webChunksRef.current = [];
      mimeTypeRef.current = mediaRecorder.mimeType || chosenMime || 'audio/webm';
      console.log('[useVoiceRecorder] recording with mime type', mimeTypeRef.current);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) webChunksRef.current.push(e.data);
      };

      try {
        mediaRecorder.start();
      } catch (err) {
        console.error('[useVoiceRecorder] mediaRecorder.start() failed', err);
        stream.getTracks().forEach(t => t.stop());
        webRecorderRef.current = null;
        webStreamRef.current = null;
        setIsRecording(false);
        Alert.alert('Recorder failed to start', describeError(err));
        return false;
      }

      setDurationMs(0);
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        setDurationMs((d) => d + 100);
      }, 100);
      return true;
    }

    // Native (expo-av)
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Microphone Access Required', 'Please enable microphone access in Settings to send voice messages.');
        return false;
      }
      if (gen !== genRef.current) return false;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      if (gen !== genRef.current) {
        recording.stopAndUnloadAsync().catch(() => {});
        return false;
      }

      recordingRef.current = recording;
      mimeTypeRef.current = Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4';
      setDurationMs(0);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setDurationMs((d) => d + 100);
      }, 100);
      return true;
    } catch (err) {
      console.error('[useVoiceRecorder] native startRecording failed', err);
      setIsRecording(false);
      Alert.alert('Recording failed', describeError(err));
      return false;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    genRef.current++;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);

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
          resolve(URL.createObjectURL(blob));
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
        return recording.getURI() ?? null;
      } catch {
        return null;
      }
    }
  }, []);

  const cancelRecording = useCallback(async () => {
    genRef.current++;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setDurationMs(0);

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
      }
    }
  }, []);

  const getMimeType = useCallback(() => mimeTypeRef.current, []);

  return { isRecording, durationMs, startRecording, stopRecording, cancelRecording, getMimeType };
}

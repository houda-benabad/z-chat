import { useState, useRef, useCallback, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { Audio } from 'expo-av';

export interface UseVoiceRecorderReturn {
  isRecording: boolean;
  durationMs: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>; // returns local file URI or null
  cancelRecording: () => Promise<void>;
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

  const startRecording = useCallback(async () => {
    if (Platform.OS === 'web') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        webStreamRef.current = stream;

        const mediaRecorder = new MediaRecorder(stream);
        webRecorderRef.current = mediaRecorder;
        webChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) webChunksRef.current.push(e.data);
        };

        mediaRecorder.start();
        setDurationMs(0);
        setIsRecording(true);

        timerRef.current = setInterval(() => {
          setDurationMs((d) => d + 100);
        }, 100);
      } catch (err) {
        setIsRecording(false);
        if (err instanceof Error && err.name === 'NotAllowedError') {
          Alert.alert('Microphone Access Required', 'Please allow microphone access in your browser to send voice messages.');
        }
      }
    } else {
      try {
        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) {
          Alert.alert('Microphone Access Required', 'Please enable microphone access in Settings to send voice messages.');
          return;
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY,
        );

        recordingRef.current = recording;
        setDurationMs(0);
        setIsRecording(true);

        timerRef.current = setInterval(() => {
          setDurationMs((d) => d + 100);
        }, 100);
      } catch {
        setIsRecording(false);
      }
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
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
          const blob = new Blob(webChunksRef.current, { type: 'audio/webm' });
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

  return { isRecording, durationMs, startRecording, stopRecording, cancelRecording };
}

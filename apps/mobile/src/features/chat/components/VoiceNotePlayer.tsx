import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio, AVPlaybackStatus } from 'expo-av';

interface VoiceNotePlayerProps {
  uri: string;
  isMine: boolean;
  accentColor: string;
  initialDurationMs?: number;
}

function formatDuration(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Static waveform pattern — a natural speech-like amplitude envelope.
// Generated once so every voice note shows the same consistent waveform shape,
// like WhatsApp's static waveform visualization.
const BAR_COUNT = 30;
const WAVEFORM_HEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) => {
  const t = i / (BAR_COUNT - 1);
  const envelope = Math.sin(t * Math.PI);                                          // louder in middle
  const detail = 0.5 + 0.5 * Math.abs(Math.sin(i * 2.1 + 0.5))
               + 0.3 * Math.abs(Math.sin(i * 3.7 + 1.2));                         // irregular variation
  return Math.max(0.15, Math.min(1.0, envelope * detail));
});

const SPEEDS = [1, 1.5, 2] as const;
type Speed = typeof SPEEDS[number];

export function VoiceNotePlayer({ uri, isMine, accentColor, initialDurationMs }: VoiceNotePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [positionMs, setPositionMs] = useState(0);
  const [speed, setSpeed] = useState<Speed>(1);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
      // Release the audio session so the next recording attempt doesn't inherit
      // a playback-locked session and hit "recorder not prepared".
      Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
    };
  }, []);

  const onPlaybackUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setPositionMs(status.positionMillis);
    if (status.durationMillis) setDurationMs(status.durationMillis);
    if (status.didJustFinish) {
      setIsPlaying(false);
      setPositionMs(0);
    }
  }, []);

  const togglePlay = useCallback(async () => {
    try {
      if (!soundRef.current) {
        // Set the audio session to playback mode before loading the sound.
        // allowsRecordingIOS: false ensures the session category is
        // AVAudioSessionCategoryPlayback, not PlayAndRecord, so audio comes
        // out of the speaker (not the earpiece) and recording can start cleanly later.
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true, rate: speed, shouldCorrectPitch: true },
          onPlaybackUpdate,
        );
        soundRef.current = sound;
        setIsPlaying(true);
        return;
      }

      const status = await soundRef.current.getStatusAsync();
      if (!status.isLoaded) return;

      if (status.isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        if (status.didJustFinish || status.positionMillis >= (status.durationMillis ?? 0)) {
          await soundRef.current.setPositionAsync(0);
        }
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch {
      setIsPlaying(false);
    }
  }, [uri, onPlaybackUpdate, speed]);

  const toggleSpeed = useCallback(async () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length] as Speed;
    setSpeed(next);
    if (soundRef.current) {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        await soundRef.current.setRateAsync(next, true);
      }
    }
  }, [speed]);

  const progress = durationMs > 0 ? positionMs / durationMs : 0;
  const filledBars = Math.round(progress * BAR_COUNT);

  const iconColor  = isMine ? '#E46C53' : accentColor;
  const fillColor  = isMine ? '#E46C53' : accentColor;
  const trackColor = isMine ? 'rgba(228,108,83,0.25)' : 'rgba(0,0,0,0.13)';
  const timeColor  = isMine ? 'rgba(228,108,83,0.7)' : '#666';
  const speedColor = isMine ? 'rgba(228,108,83,0.55)' : '#888';

  return (
    <View style={styles.container}>
      <Pressable onPress={togglePlay} hitSlop={8} style={[styles.playBtn, isMine && styles.playBtnMine]}>
        <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color={iconColor} />
      </Pressable>

      <View style={styles.trackContainer}>
        {/* Waveform bars */}
        <View style={styles.waveformRow}>
          {WAVEFORM_HEIGHTS.map((h, i) => (
            <View
              key={i}
              style={[
                styles.bar,
                {
                  height: Math.max(4, Math.round(h * 20)),
                  backgroundColor: i < filledBars ? fillColor : trackColor,
                },
              ]}
            />
          ))}
        </View>

        {/* Time + speed */}
        <View style={styles.metaRow}>
          <Text style={[styles.time, { color: timeColor }]}>
            {formatDuration(isPlaying || positionMs > 0 ? positionMs : (durationMs || initialDurationMs || 0))}
          </Text>
          <Pressable onPress={toggleSpeed} hitSlop={8}>
            <Text style={[styles.speedText, { color: speedColor }]}>
              {speed === 1 ? '1×' : speed === 1.5 ? '1.5×' : '2×'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 180,
    paddingVertical: 2,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  playBtnMine: {
    backgroundColor: 'rgba(228,108,83,0.15)',
  },
  trackContainer: {
    flex: 1,
    gap: 5,
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
    gap: 1,
  },
  bar: {
    flex: 1,         // fills available width evenly across all 30 bars
    borderRadius: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    fontSize: 11,
  },
  speedText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

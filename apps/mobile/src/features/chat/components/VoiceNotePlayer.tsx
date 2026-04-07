import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio, AVPlaybackStatus } from 'expo-av';

interface VoiceNotePlayerProps {
  uri: string;
  isMine: boolean;
  accentColor: string;
}

function formatDuration(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function VoiceNotePlayer({ uri, isMine, accentColor }: VoiceNotePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [positionMs, setPositionMs] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
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
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
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
  }, [uri, onPlaybackUpdate]);

  const progress = durationMs > 0 ? positionMs / durationMs : 0;
  const iconColor = isMine ? '#fff' : accentColor;
  const trackColor = isMine ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.15)';
  const fillColor = isMine ? '#fff' : accentColor;
  const timeColor = isMine ? 'rgba(255,255,255,0.8)' : '#666';

  return (
    <View style={styles.container}>
      <Pressable onPress={togglePlay} hitSlop={8} style={styles.playBtn}>
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={20}
          color={iconColor}
        />
      </Pressable>

      <View style={styles.trackContainer}>
        <View style={[styles.track, { backgroundColor: trackColor }]}>
          <View style={[styles.fill, { width: `${progress * 100}%` as unknown as number, backgroundColor: fillColor }]} />
        </View>
        <Text style={[styles.time, { color: timeColor }]}>
          {formatDuration(isPlaying || positionMs > 0 ? positionMs : durationMs)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 160,
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
  trackContainer: {
    flex: 1,
    gap: 4,
  },
  track: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  time: {
    fontSize: 11,
  },
});

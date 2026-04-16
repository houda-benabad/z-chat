import { useState, useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

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

// Static waveform pattern — consistent speech-like amplitude envelope.
const BAR_COUNT = 30;
const WAVEFORM_HEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) => {
  const t = i / (BAR_COUNT - 1);
  const envelope = Math.sin(t * Math.PI);
  const detail = 0.5 + 0.5 * Math.abs(Math.sin(i * 2.1 + 0.5))
               + 0.3 * Math.abs(Math.sin(i * 3.7 + 1.2));
  return Math.max(0.15, Math.min(1.0, envelope * detail));
});

const SPEEDS = [1, 1.5, 2] as const;
type Speed = typeof SPEEDS[number];

export function VoiceNotePlayer({ uri, isMine, accentColor, initialDurationMs }: VoiceNotePlayerProps) {
  const player = useAudioPlayer(uri, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const [speed, setSpeed] = useState<Speed>(1);

  // Reset position to start when playback finishes so next tap replays.
  useEffect(() => {
    if (status.didJustFinish) {
      player.seekTo(0).catch(() => {});
    }
  }, [status.didJustFinish, player]);

  const togglePlay = useCallback(() => {
    if (status.playing) {
      player.pause();
    } else {
      // If finished (position at end), rewind before playing.
      if (status.duration > 0 && status.currentTime >= status.duration) {
        player.seekTo(0).catch(() => {});
      }
      player.play();
    }
  }, [player, status.playing, status.currentTime, status.duration]);

  const toggleSpeed = useCallback(() => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length] as Speed;
    setSpeed(next);
    player.setPlaybackRate(next, 'high');
  }, [speed, player]);

  const durationMs = status.duration * 1000;
  const positionMs = status.currentTime * 1000;
  const progress = durationMs > 0 ? positionMs / durationMs : 0;
  const filledBars = Math.round(progress * BAR_COUNT);

  const iconColor  = isMine ? '#E46C53' : accentColor;
  const fillColor  = isMine ? '#E46C53' : accentColor;
  const trackColor = isMine ? 'rgba(228,108,83,0.25)' : 'rgba(0,0,0,0.13)';
  const timeColor  = isMine ? 'rgba(228,108,83,0.7)' : '#666';
  const speedColor = isMine ? 'rgba(228,108,83,0.55)' : '#888';

  const displayMs = status.playing || positionMs > 0
    ? positionMs
    : (durationMs || initialDurationMs || 0);

  return (
    <View style={styles.container}>
      <Pressable onPress={togglePlay} hitSlop={8} style={[styles.playBtn, isMine && styles.playBtnMine]}>
        <Ionicons name={status.playing ? 'pause' : 'play'} size={20} color={iconColor} />
      </Pressable>

      <View style={styles.trackContainer}>
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

        <View style={styles.metaRow}>
          <Text style={[styles.time, { color: timeColor }]}>
            {formatDuration(displayMs)}
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
    flex: 1,
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

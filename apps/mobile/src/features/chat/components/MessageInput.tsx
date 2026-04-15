import { useRef, useState, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, ActivityIndicator, Modal, StyleSheet,
  Animated as RNAnimated, type GestureResponderEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { useAttachmentPicker } from '../hooks/useAttachmentPicker';
import { createStyles } from './styles/MessageInput.styles';
import type { ChatMessage } from '@/types';

const SLIDE_CANCEL_THRESHOLD = 80; // px left  → cancel
const SLIDE_LOCK_THRESHOLD   = 80; // px up    → lock

// 12 wave bars with staggered durations so they animate at different speeds,
// producing a rolling wave effect without importing extra animation libraries.
const WAVE_BAR_COUNT = 12;
const WAVE_BAR_DURATIONS = Array.from({ length: WAVE_BAR_COUNT }, (_, i) => 220 + i * 25);
const WAVE_BAR_MAX     = Array.from({ length: WAVE_BAR_COUNT }, (_, i) =>
  0.25 + 0.75 * Math.abs(Math.sin(i * 0.9 + 0.5)),
);

interface MessageInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  bottomInset: number;
  replyToMessage?: ChatMessage | null;
  onCancelReply?: () => void;
  onMediaSelected?: (uri: string, mimeType: string, mediaType: 'image' | 'video' | 'document') => Promise<void>;
  uploadingMedia?: boolean;
  isRecordingVoice?: boolean;
  recordingDurationMs?: number;
  onVoiceStart?: () => void | boolean | Promise<boolean | void>;
  onVoiceStop?: () => void;
  onVoiceCancel?: () => void;
}

function formatDuration(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function MessageInput({
  value,
  onChangeText,
  onSend,
  bottomInset,
  replyToMessage,
  onCancelReply,
  onMediaSelected,
  uploadingMedia = false,
  isRecordingVoice = false,
  recordingDurationMs = 0,
  onVoiceStart,
  onVoiceStop,
  onVoiceCancel,
}: MessageInputProps) {
  const styles  = useThemedStyles(createStyles);
  const hasText = value.trim().length > 0;
  const [isFocused,    setIsFocused]    = useState(false);
  const [gestureActive, setGestureActive] = useState(false);
  const [isCanceling,  setIsCanceling]  = useState(false);
  const [isLocked,     setIsLocked]     = useState(false);
  const isLockedRef  = useRef(false); // sync ref so gesture handlers read current value
  const isActive     = isFocused || hasText;
  const showRecording = gestureActive || isRecordingVoice;

  // Reanimated shared value for mic button horizontal slide
  const translationX  = useSharedValue(0);
  const startXRef     = useRef(0);
  const startYRef     = useRef(0);
  const finishedRef   = useRef(false);

  // Wave bar animation (core RNAnimated — height isn't supported by useNativeDriver)
  const waveAnims = useRef(
    Array.from({ length: WAVE_BAR_COUNT }, () => new RNAnimated.Value(0.1)),
  ).current;
  const waveLoopsRef = useRef<RNAnimated.CompositeAnimation[]>([]);

  // Start / stop wave animation when recording state changes
  useEffect(() => {
    if (showRecording) {
      waveLoopsRef.current.forEach(l => l.stop());
      waveLoopsRef.current = waveAnims.map((anim, i) => {
        const loop = RNAnimated.loop(
          RNAnimated.sequence([
            RNAnimated.timing(anim, {
              toValue: WAVE_BAR_MAX[i]!,
              duration: WAVE_BAR_DURATIONS[i]!,
              useNativeDriver: false,
            }),
            RNAnimated.timing(anim, {
              toValue: 0.1,
              duration: WAVE_BAR_DURATIONS[i]!,
              useNativeDriver: false,
            }),
          ]),
        );
        loop.start();
        return loop;
      });
      return () => waveLoopsRef.current.forEach(l => l.stop());
    } else {
      waveLoopsRef.current.forEach(l => l.stop());
      waveAnims.forEach(a => a.setValue(0.1));
    }
  }, [showRecording]);

  // If recording stopped externally (e.g. error), reset lock state
  useEffect(() => {
    if (!isRecordingVoice && isLockedRef.current) {
      isLockedRef.current = false;
      setIsLocked(false);
      setGestureActive(false);
    }
  }, [isRecordingVoice]);

  const { menuVisible, openMenu, closeMenu, pickPhoto, pickVideo, pickDocument } = useAttachmentPicker({
    onMediaSelected: onMediaSelected ?? (async () => {}),
    disabled: uploadingMedia,
  });

  const animatedMicStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translationX.value }],
  }));

  const animatedHintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      Math.abs(translationX.value),
      [0, SLIDE_CANCEL_THRESHOLD],
      [1, 0.3],
      Extrapolation.CLAMP,
    ),
  }));

  // ── Gesture handlers ────────────────────────────────────────────────────
  const handleBegin = async (e: GestureResponderEvent) => {
    startXRef.current  = e.nativeEvent.pageX;
    startYRef.current  = e.nativeEvent.pageY;
    finishedRef.current = false;
    isLockedRef.current = false;
    translationX.value  = 0;
    setGestureActive(true);
    setIsCanceling(false);
    setIsLocked(false);
    const result = await onVoiceStart?.();
    if (result === false) {
      finishedRef.current  = true;
      isLockedRef.current  = false;
      setGestureActive(false);
      setIsCanceling(false);
      setIsLocked(false);
      translationX.value = withTiming(0, { duration: 150 });
    }
  };

  const handleMove = (e: GestureResponderEvent) => {
    if (isLockedRef.current) return; // finger movement ignored once locked
    const dx = Math.min(0, e.nativeEvent.pageX - startXRef.current);
    const dy = e.nativeEvent.pageY - startYRef.current; // negative = upward
    translationX.value = dx;
    setIsCanceling(dx < -SLIDE_CANCEL_THRESHOLD);
    // Slide up to lock
    if (dy < -SLIDE_LOCK_THRESHOLD) {
      isLockedRef.current = true;
      setIsLocked(true);
      setIsCanceling(false);
      translationX.value = withTiming(0, { duration: 150 });
    }
  };

  const handleFinish = (canceled: boolean) => {
    if (finishedRef.current)    return;
    if (isLockedRef.current)    return; // finger release does nothing when locked
    finishedRef.current = true;
    setGestureActive(false);
    setIsCanceling(false);
    translationX.value = withTiming(0, { duration: 150 });
    if (canceled) onVoiceCancel?.();
    else          onVoiceStop?.();
  };

  const handleLockedSend = () => {
    isLockedRef.current = false;
    setIsLocked(false);
    setGestureActive(false);
    finishedRef.current = true;
    onVoiceStop?.();
  };

  const handleLockedCancel = () => {
    isLockedRef.current = false;
    setIsLocked(false);
    setGestureActive(false);
    finishedRef.current = true;
    onVoiceCancel?.();
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(bottomInset, 10) }]}>
      {replyToMessage && !showRecording && (
        <View style={styles.replyBar}>
          <View style={styles.replyBarContent}>
            <Ionicons name="return-down-back-outline" size={16} color="#E46C53" style={{ marginRight: 6 }} />
            <Text style={styles.replyBarText} numberOfLines={1}>
              {replyToMessage.isDeleted ? 'Deleted message' : replyToMessage.content ?? replyToMessage.type}
            </Text>
          </View>
          <Pressable onPress={onCancelReply} hitSlop={8}>
            <Ionicons name="close" size={18} color="#888" />
          </Pressable>
        </View>
      )}

      <View style={styles.inputRow}>
        {/* ── Recording row ────────────────────────────────────────── */}
        {showRecording ? (
          <View style={styles.recordingRow}>
            {/* Animated waveform bars */}
            <View style={styles.waveformContainer}>
              {waveAnims.map((anim, i) => (
                <RNAnimated.View
                  key={i}
                  style={[
                    styles.waveBar,
                    {
                      height: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [4, 24],
                      }),
                    },
                  ]}
                />
              ))}
            </View>

            <Text style={styles.recordingTimer}>{formatDuration(recordingDurationMs)}</Text>

            {isLocked ? (
              <Ionicons name="lock-closed" size={14} color="#E46C53" style={styles.lockedIcon} />
            ) : (
              <>
                <Animated.Text
                  style={[styles.slideHint, isCanceling && styles.slideHintCancel, animatedHintStyle]}
                >
                  {isCanceling ? 'Release to cancel' : '‹ Slide to cancel'}
                </Animated.Text>
                <Animated.Text style={[styles.slideUpHint, animatedHintStyle]}>↑</Animated.Text>
              </>
            )}
          </View>
        ) : (
          /* ── Normal input row ──────────────────────────────────── */
          <>
            <Pressable style={styles.attachBtn} hitSlop={8} onPress={openMenu} disabled={uploadingMedia}>
              {uploadingMedia
                ? <ActivityIndicator size="small" color="#aaa" />
                : <Ionicons name="add-circle-outline" size={28} color="#aaa" />
              }
            </Pressable>

            <View style={[styles.inputWrap, isActive && styles.inputWrapFocused]}>
              <TextInput
                style={styles.textInput}
                placeholder="Message"
                placeholderTextColor="#bbb"
                value={value}
                onChangeText={onChangeText}
                maxLength={4096}
                multiline
                underlineColorAndroid="transparent"
                selectionColor="#E46C53"
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />
            </View>
          </>
        )}

        {/* ── Right button(s) ──────────────────────────────────────── */}
        {!showRecording && hasText ? (
          /* Send text */
          <Pressable style={styles.sendBtn} onPress={onSend}>
            <LinearGradient
              colors={['#E46C53', '#ED2F3C']}
              style={styles.sendBtnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 2 }} />
            </LinearGradient>
          </Pressable>
        ) : isLocked ? (
          /* Locked recording — trash + send */
          <>
            <Pressable style={styles.lockedTrashBtn} onPress={handleLockedCancel} hitSlop={8}>
              <Ionicons name="trash-outline" size={22} color="#ED2F3C" />
            </Pressable>
            <Pressable style={styles.sendBtn} onPress={handleLockedSend}>
              <LinearGradient
                colors={['#E46C53', '#ED2F3C']}
                style={styles.sendBtnGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 2 }} />
              </LinearGradient>
            </Pressable>
          </>
        ) : (
          /* Mic button — press-and-hold + slide gestures */
          <Animated.View
            style={[styles.sendBtn, animatedMicStyle]}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={handleBegin}
            onResponderMove={handleMove}
            onResponderRelease={(e) => {
              const dx = Math.min(0, e.nativeEvent.pageX - startXRef.current);
              handleFinish(dx < -SLIDE_CANCEL_THRESHOLD);
            }}
            onResponderTerminate={() => handleFinish(true)}
            onResponderTerminationRequest={() => false}
          >
            <LinearGradient
              colors={isCanceling ? ['#ED2F3C', '#ED2F3C'] : ['#E46C53', '#ED2F3C']}
              style={styles.sendBtnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name={isCanceling ? 'trash-outline' : 'mic-outline'} size={18} color="#fff" />
            </LinearGradient>
          </Animated.View>
        )}
      </View>

      <Modal transparent animationType="fade" visible={menuVisible} onRequestClose={closeMenu}>
        <View style={styles.menuOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />
          <View style={styles.attachMenu}>
            <Pressable style={styles.attachMenuItem} onPress={pickPhoto}>
              <Ionicons name="image-outline" size={22} color="#E46C53" />
              <Text style={styles.attachMenuText}>Photo</Text>
            </Pressable>
            <Pressable style={styles.attachMenuItem} onPress={pickVideo}>
              <Ionicons name="videocam-outline" size={22} color="#E46C53" />
              <Text style={styles.attachMenuText}>Video</Text>
            </Pressable>
            <Pressable style={styles.attachMenuItem} onPress={pickDocument}>
              <Ionicons name="document-outline" size={22} color="#E46C53" />
              <Text style={styles.attachMenuText}>File</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

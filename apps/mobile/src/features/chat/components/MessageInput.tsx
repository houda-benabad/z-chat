import { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, ActivityIndicator, Keyboard,
  type GestureResponderEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { useKeyboardVisible } from '@/shared/hooks';
import { useAttachmentPicker } from '../hooks/useAttachmentPicker';
import { AttachmentSheet } from './AttachmentSheet';
import { MediaPreviewModal } from './MediaPreviewModal';
import { createStyles } from './styles/MessageInput.styles';
import type { ChatMessage } from '@/types';

const SLIDE_CANCEL_THRESHOLD = 80; // px left  → cancel
const SLIDE_LOCK_THRESHOLD   = 80; // px up    → lock

// 12 wave bars with staggered durations so they animate at different speeds,
// producing a rolling wave effect. Driven by Reanimated shared values on the
// UI thread via scaleY transform.
const WAVE_BAR_COUNT = 12;
const WAVE_BAR_DURATIONS = Array.from({ length: WAVE_BAR_COUNT }, (_, i) => 220 + i * 25);
const WAVE_BAR_MAX     = Array.from({ length: WAVE_BAR_COUNT }, (_, i) =>
  0.25 + 0.75 * Math.abs(Math.sin(i * 0.9 + 0.5)),
);
const WAVE_BAR_MIN = 0.17; // 4 / 24 — matches the old height:4 idle state.

interface MessageInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  bottomInset: number;
  replyToMessage?: ChatMessage | null;
  onCancelReply?: () => void;
  onMediaSelected?: (uri: string, mimeType: string, mediaType: 'image' | 'video' | 'document', caption: string) => Promise<void>;
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
  const isKeyboardVisible = useKeyboardVisible();
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
  // Debounce — only call setIsCanceling when boolean actually changes.
  const wasCancelingRef = useRef(false);

  // If recording stopped externally (e.g. error), reset lock state
  useEffect(() => {
    if (!isRecordingVoice && isLockedRef.current) {
      isLockedRef.current = false;
      setIsLocked(false);
      setGestureActive(false);
    }
  }, [isRecordingVoice]);

  const attachSheetRef = useRef<BottomSheetModal>(null);
  const openMenu = useCallback(() => {
    if (!uploadingMedia) {
      Keyboard.dismiss();
      attachSheetRef.current?.present();
    }
  }, [uploadingMedia]);

  const { openCamera, openGallery, openDocument, pendingMedia, confirmSend, cancelPending } = useAttachmentPicker({
    onMediaSelected: onMediaSelected ?? (async () => {}),
    disabled: uploadingMedia,
  });

  const handleSheetAction = useCallback((action: () => void) => {
    attachSheetRef.current?.dismiss();
    action();
  }, []);

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
    wasCancelingRef.current = false;
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
    const nextCanceling = dx < -SLIDE_CANCEL_THRESHOLD;
    if (nextCanceling !== wasCancelingRef.current) {
      wasCancelingRef.current = nextCanceling;
      setIsCanceling(nextCanceling);
    }
    // Slide up to lock
    if (dy < -SLIDE_LOCK_THRESHOLD) {
      isLockedRef.current = true;
      setIsLocked(true);
      if (wasCancelingRef.current) {
        wasCancelingRef.current = false;
        setIsCanceling(false);
      }
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
    <View style={[styles.container, { paddingBottom: isKeyboardVisible ? 8 : Math.max(bottomInset, 10) }]}>
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
            {/* Animated waveform bars (Reanimated, UI-thread scaleY) */}
            <View style={styles.waveformContainer}>
              {WAVE_BAR_DURATIONS.map((dur, i) => (
                <WaveBar
                  key={i}
                  running={showRecording}
                  maxScale={WAVE_BAR_MAX[i]!}
                  duration={dur}
                  style={styles.waveBar}
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

      <AttachmentSheet
        ref={attachSheetRef}
        onCamera={() => handleSheetAction(openCamera)}
        onGallery={() => handleSheetAction(openGallery)}
        onDocument={() => handleSheetAction(openDocument)}
      />

      <MediaPreviewModal
        media={pendingMedia}
        onSend={confirmSend}
        onClose={cancelPending}
      />
    </View>
  );
}

interface WaveBarProps {
  running: boolean;
  maxScale: number;
  duration: number;
  style: object;
}

function WaveBar({ running, maxScale, duration, style }: WaveBarProps) {
  const scale = useSharedValue(WAVE_BAR_MIN);

  useEffect(() => {
    if (running) {
      scale.value = withRepeat(
        withSequence(
          withTiming(maxScale,       { duration }),
          withTiming(WAVE_BAR_MIN,   { duration }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(scale);
      scale.value = WAVE_BAR_MIN;
    }
  }, [running, maxScale, duration, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale.value }],
  }));

  return <Animated.View style={[style, animatedStyle]} />;
}

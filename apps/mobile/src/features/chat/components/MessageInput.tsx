import { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Modal, type GestureResponderEvent } from 'react-native';
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

const SLIDE_CANCEL_THRESHOLD = 80;

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
  const styles = useThemedStyles(createStyles);
  const hasText = value.trim().length > 0;
  const [isFocused, setIsFocused] = useState(false);
  const [gestureActive, setGestureActive] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const isActive = isFocused || hasText;

  const translationX = useSharedValue(0);
  const startXRef = useRef(0);
  const finishedRef = useRef(false);

  const { menuVisible, openMenu, closeMenu, pickPhoto, pickVideo, pickDocument } = useAttachmentPicker({
    onMediaSelected: onMediaSelected ?? (async () => {}),
    disabled: uploadingMedia,
  });

  const showRecording = gestureActive || isRecordingVoice;

  const handleBegin = async (e: GestureResponderEvent) => {
    startXRef.current = e.nativeEvent.pageX;
    finishedRef.current = false;
    translationX.value = 0;
    setGestureActive(true);
    setIsCanceling(false);
    const result = await onVoiceStart?.();
    if (result === false) {
      finishedRef.current = true;
      setGestureActive(false);
      setIsCanceling(false);
      translationX.value = withTiming(0, { duration: 150 });
    }
  };

  const handleMove = (e: GestureResponderEvent) => {
    const dx = Math.min(0, e.nativeEvent.pageX - startXRef.current);
    translationX.value = dx;
    setIsCanceling(dx < -SLIDE_CANCEL_THRESHOLD);
  };

  const handleFinish = (canceled: boolean) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setGestureActive(false);
    setIsCanceling(false);
    translationX.value = withTiming(0, { duration: 150 });
    if (canceled) onVoiceCancel?.();
    else onVoiceStop?.();
  };

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
        {showRecording ? (
          <View style={styles.recordingRow}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingTimer}>{formatDuration(recordingDurationMs)}</Text>
            <Animated.Text style={[styles.slideHint, isCanceling && styles.slideHintCancel, animatedHintStyle]}>
              {isCanceling ? 'Release to cancel' : '‹ Slide to cancel'}
            </Animated.Text>
          </View>
        ) : (
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
                onSubmitEditing={onSend}
                underlineColorAndroid="transparent"
                selectionColor="#E46C53"
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />
            </View>
          </>
        )}

        {!showRecording && hasText ? (
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
        ) : (
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
        <Pressable style={styles.menuOverlay} onPress={closeMenu}>
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
        </Pressable>
      </Modal>
    </View>
  );
}

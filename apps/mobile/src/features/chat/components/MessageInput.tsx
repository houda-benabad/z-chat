import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import EmojiPicker from 'rn-emoji-keyboard';
import type { EmojiType } from 'rn-emoji-keyboard';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { createStyles } from './styles/MessageInput.styles';
import type { ChatMessage } from '@/types';

interface MessageInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  bottomInset: number;
  replyToMessage?: ChatMessage | null;
  onCancelReply?: () => void;
  onMediaSelected?: (uri: string, mimeType: string) => Promise<void>;
  uploadingMedia?: boolean;
  isRecordingVoice?: boolean;
  recordingDurationMs?: number;
  onVoiceStart?: () => void;
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
  const [emojiOpen, setEmojiOpen] = useState(false);

  const handleEmojiPick = (emoji: EmojiType) => {
    onChangeText(value + emoji.emoji);
  };

  const handleAttachPress = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Photo Access Required',
        'Please enable photo library access in Settings to send images.',
        [{ text: 'OK' }],
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const mimeType = asset.mimeType ?? 'image/jpeg';
      await onMediaSelected?.(asset.uri, mimeType);
    }
  };

  // While recording: show the recording bar instead of the normal input
  if (isRecordingVoice) {
    return (
      <View style={[styles.container, { paddingBottom: Math.max(bottomInset, 12) }]}>
        <View style={styles.inputRow}>
          <Pressable hitSlop={12} onPress={onVoiceCancel}>
            <Ionicons name="trash-outline" size={24} color="#E46C53" />
          </Pressable>
          <View style={styles.inputWrap}>
            <Ionicons name="radio-button-on" size={14} color="#E46C53" style={{ marginRight: 4 }} />
            <Text style={[styles.textInput, { color: '#E46C53' }]}>
              {formatDuration(recordingDurationMs)}
            </Text>
          </View>
          <Pressable style={styles.sendBtn} onPress={onVoiceStop}>
            <LinearGradient
              colors={['#E46C53', '#ED2F3C']}
              style={styles.sendBtnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 2 }} />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: Math.max(bottomInset, 12) }]}>
      {replyToMessage && (
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
      <View style={styles.inputWrap}>
        <Pressable hitSlop={8} onPress={() => setEmojiOpen(true)}>
          <Ionicons name="happy-outline" size={22} color="#aaa" />
        </Pressable>
        <TextInput
          style={styles.textInput}
          placeholder="Message"
          placeholderTextColor="#bbb"
          value={value}
          onChangeText={onChangeText}
          multiline
          maxLength={4096}
          onSubmitEditing={onSend}
        />
        <Pressable hitSlop={8} onPress={handleAttachPress} disabled={uploadingMedia}>
          {uploadingMedia
            ? <ActivityIndicator size="small" color="#aaa" />
            : <Ionicons name="attach" size={22} color="#aaa" />
          }
        </Pressable>
      </View>

      {hasText ? (
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
        <Pressable style={styles.sendBtn} onLongPress={onVoiceStart} delayLongPress={200}>
          <LinearGradient
            colors={['#E0E0E0', '#E0E0E0']}
            style={styles.sendBtnGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="mic-outline" size={18} color="#fff" />
          </LinearGradient>
        </Pressable>
      )}
      </View>

      <EmojiPicker
        onEmojiSelected={handleEmojiPick}
        open={emojiOpen}
        onClose={() => setEmojiOpen(false)}
        enableRecentlyUsed
      />
    </View>
  );
}

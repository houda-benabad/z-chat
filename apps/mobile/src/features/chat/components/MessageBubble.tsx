import { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatMessageTime } from '@/shared/utils';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { DateSeparator } from './DateSeparator';
import { SystemEventBar } from './SystemEventBar';
import { ImageViewer } from './ImageViewer';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import { isSameDay } from '../utils/messageUtils';
import type { ChatMessage } from '@/types';
import { createStyles } from './styles/MessageBubble.styles';

interface MessageBubbleProps {
  message: ChatMessage;
  prevMessage: ChatMessage | null;
  nextMessage: ChatMessage | null;
  myUserId: string;
  isGroup: boolean;
  readUpToIndex: number;
  deliveredUpToIndex: number;
  index: number;
  showReadReceipts?: boolean;
  onLongPress?: (message: ChatMessage) => void;
  onRetryFailed?: (message: ChatMessage) => void;
}

export function MessageBubble({
  message,
  prevMessage,
  nextMessage,
  myUserId,
  isGroup,
  readUpToIndex,
  deliveredUpToIndex,
  index,
  showReadReceipts = true,
  onLongPress,
  onRetryFailed,
}: MessageBubbleProps) {
  const styles      = useThemedStyles(createStyles);
  const { accentColor, fontSizePt } = useAppSettings();
  const isMine      = message.senderId === myUserId;
  const showDate    = !prevMessage || !isSameDay(prevMessage.createdAt, message.createdAt);
  const showSender  = isGroup && !isMine && prevMessage?.senderId !== message.senderId;
  const isTail      = !nextMessage || nextMessage.senderId !== message.senderId;
  const isRead      = showReadReceipts && readUpToIndex >= 0 && index <= readUpToIndex;
  const isDelivered = isRead || (deliveredUpToIndex >= 0 && index <= deliveredUpToIndex);
  const tickColor   = isRead ? accentColor : '#9E9E9E';

  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [imgError,     setImgError]     = useState(false);

  if (message.type === 'system') {
    return (
      <>
        {showDate && <DateSeparator dateStr={message.createdAt} />}
        <SystemEventBar message={message} myUserId={myUserId} />
      </>
    );
  }

  const timeLabel = message.failed
    ? 'Failed — tap to retry'
    : message.pending
    ? 'Sending…'
    : formatMessageTime(message.createdAt);

  // Ticks shown only for my messages in 1-on-1 chats
  const ticks = isMine && !isGroup ? (
    message.failed ? (
      <Ionicons name="alert-circle" size={13} color={accentColor} />
    ) : message.pending ? (
      <Ionicons name="time-outline" size={12} color={accentColor} />
    ) : (
      <Ionicons
        name={isDelivered ? 'checkmark-done' : 'checkmark'}
        size={13}
        color={tickColor}
      />
    )
  ) : null;

  const isMedia = message.type === 'image'      && !!message.mediaUrl;
  const isVoice = message.type === 'voice_note' && !!message.mediaUrl;

  return (
    <>
      {showDate && <DateSeparator dateStr={message.createdAt} />}

      <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
        <Pressable
          style={{ maxWidth: '78%', minWidth: 72 }}
          onPress={message.failed && onRetryFailed ? () => onRetryFailed(message) : undefined}
          onLongPress={onLongPress ? () => onLongPress(message) : undefined}
          delayLongPress={300}
        >
          <View style={[
            styles.bubble,
            isMine ? styles.bubbleMine : styles.bubbleTheirs,
            message.pending && styles.bubblePending,
          ]}>
            {showSender && (
              <Text style={styles.senderName}>{message.sender?.name ?? 'Unknown'}</Text>
            )}

            {message.replyTo && (
              <View style={[styles.replyBar, isMine && styles.replyBarMine]}>
                <Text style={styles.replyText} numberOfLines={2}>
                  {message.replyTo.content ?? message.replyTo.type}
                </Text>
              </View>
            )}

            {/* ── Image ─────────────────────────────────────────────────── */}
            {isMedia ? (
              <Pressable onPress={() => !imgError && setViewingImage(message.mediaUrl)}>
                {imgError ? (
                  <View style={[styles.mediaBubble, mediaBrokenStyle.wrap]}>
                    <Ionicons name="image-outline" size={32} color="#ccc" />
                  </View>
                ) : (
                  <Image
                    source={{ uri: message.mediaUrl! }}
                    style={styles.mediaBubble}
                    resizeMode="cover"
                    onError={() => setImgError(true)}
                  />
                )}
              </Pressable>

            /* ── Voice note ───────────────────────────────────────────── */
            ) : isVoice ? (
              <VoiceNotePlayer uri={message.mediaUrl!} isMine={isMine} accentColor={accentColor} />

            /* ── Text ─────────────────────────────────────────────────── */
            ) : (
              <View style={{ position: 'relative' }}>
                <Text style={[
                  styles.msgText,
                  isMine ? styles.msgTextMine : styles.msgTextTheirs,
                  { fontSize: fontSizePt },
                  message.isDeleted && styles.msgTextDeleted,
                ]}>
                  {message.isDeleted ? 'This message was deleted' : message.content}
                  {/* Invisible ghost reserves space on the last line for the time */}
                  <Text style={styles.ghostTime}>
                    {'  ' + timeLabel + (isMine && !isGroup && !message.isDeleted ? '  ✓✓' : '')}
                  </Text>
                </Text>
                {/* Actual time + ticks overlaid at bottom-right */}
                <View style={[styles.msgMeta, { position: 'absolute', bottom: 0, right: 0 }]}>
                  <Text
                    style={[styles.msgTime, isMine ? styles.msgTimeMine : styles.msgTimeTheirs]}
                    numberOfLines={1}
                  >
                    {timeLabel}
                  </Text>
                  {!message.isDeleted && ticks}
                </View>
              </View>
            )}

            {/* Time + ticks below content — media only */}
            {(isMedia || isVoice) && (
              <View style={styles.msgMeta}>
                <Text
                  style={[styles.msgTime, isMine ? styles.msgTimeMine : styles.msgTimeTheirs]}
                  numberOfLines={1}
                >
                  {timeLabel}
                </Text>
                {ticks}
              </View>
            )}
          </View>
        </Pressable>
      </View>

      <ImageViewer uri={viewingImage} onClose={() => setViewingImage(null)} />
    </>
  );
}

const mediaBrokenStyle = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0' },
});

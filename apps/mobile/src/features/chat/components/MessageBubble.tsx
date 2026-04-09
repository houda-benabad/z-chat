import { useState, useEffect, useRef } from 'react';
import { View, Text, Image, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatMessageTime } from '@/shared/utils';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { DateSeparator } from './DateSeparator';
import { SystemEventBar } from './SystemEventBar';
import { ImageViewer } from './ImageViewer';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import { isSameDay } from '../utils/messageUtils';
import { Avatar } from '@/shared/components';
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
  isStarred?: boolean;
  isHighlighted?: boolean;
  onLongPress?: (message: ChatMessage) => void;
  onRetryFailed?: (message: ChatMessage) => void;
  resolveName?: (userId: string) => string | null;
  resolveAvatar?: (userId: string) => string | null;
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
  isStarred,
  isHighlighted,
  onLongPress,
  onRetryFailed,
  resolveName,
  resolveAvatar,
}: MessageBubbleProps) {
  const styles      = useThemedStyles(createStyles);
  const { accentColor, fontSizePt } = useAppSettings();
  const isMine      = message.senderId === myUserId;
  const showDate    = !prevMessage || !isSameDay(prevMessage.createdAt, message.createdAt);
  const senderChanged = !prevMessage || prevMessage.senderId !== message.senderId || prevMessage.type === 'system';
  const timeGap = prevMessage
    ? new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() > 5 * 60 * 1000
    : false;
  const showSender  = isGroup && !isMine && (senderChanged || showDate || timeGap);
  const isTail      = !nextMessage || nextMessage.senderId !== message.senderId;
  const showAvatarCol = isGroup && !isMine;
  const avatarUri   = showAvatarCol ? (resolveAvatar?.(message.senderId) ?? message.sender?.avatar ?? null) : null;
  const avatarName  = showAvatarCol ? (resolveName?.(message.senderId) ?? message.sender?.name ?? 'Unknown') : '';
  const isRead      = showReadReceipts && readUpToIndex >= 0 && index <= readUpToIndex;
  const isDelivered = isRead || (deliveredUpToIndex >= 0 && index <= deliveredUpToIndex);
  const tickColor   = isRead ? accentColor : '#9E9E9E';

  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [imgError,     setImgError]     = useState(false);

  const highlightAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isHighlighted) return;
    highlightAnim.setValue(0);
    Animated.sequence([
      Animated.timing(highlightAnim, { toValue: 0.55, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.delay(300),
      Animated.timing(highlightAnim, { toValue: 0, duration: 500, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [isHighlighted]);

  if (message.type === 'system') {
    return (
      <>
        {showDate && <DateSeparator dateStr={message.createdAt} />}
        <SystemEventBar message={message} myUserId={myUserId} resolveName={resolveName} />
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
        {showAvatarCol && (
          <View style={styles.avatarColumn}>
            {isTail ? (
              <Avatar uri={avatarUri} name={avatarName} size={28} />
            ) : (
              <View style={styles.avatarSpacer} />
            )}
          </View>
        )}
        <Pressable
          style={{ maxWidth: showAvatarCol ? '72%' : '78%', minWidth: 72 }}
          onPress={message.failed && onRetryFailed ? () => onRetryFailed(message) : undefined}
          onLongPress={onLongPress ? () => onLongPress(message) : undefined}
          delayLongPress={300}
        >
          <View style={[
            styles.bubble,
            isMine ? styles.bubbleMine : styles.bubbleTheirs,
            message.pending && styles.bubblePending,
          ]}>
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                {
                  backgroundColor: '#E46C53',
                  opacity: highlightAnim,
                  borderRadius: 10,
                  borderBottomRightRadius: isMine ? 2 : 10,
                  borderBottomLeftRadius: isMine ? 10 : 2,
                },
              ]}
              pointerEvents="none"
            />
            {showSender && (
              <Text style={styles.senderName}>{resolveName?.(message.senderId) ?? message.sender?.name ?? 'Unknown'}</Text>
            )}

            {message.replyTo && (
              <View style={[styles.replyBar, isMine && styles.replyBarMine]}>
                <Text style={styles.replyText} numberOfLines={2}>
                  {message.replyTo.content ?? message.replyTo.type}
                </Text>
              </View>
            )}

            {message.isForwarded && !message.isDeleted && (
              <View style={styles.forwardedLabel}>
                <Ionicons name="arrow-redo-outline" size={11} color="#888888" />
                <Text style={styles.forwardedText}>Forwarded</Text>
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
                    {'  ' + (isStarred ? '★ ' : '') + timeLabel + (isMine && !isGroup && !message.isDeleted ? '  ✓✓' : '')}
                  </Text>
                </Text>
                {/* Actual time + ticks overlaid at bottom-right */}
                <View style={[styles.msgMeta, { position: 'absolute', bottom: 0, right: 0 }]}>
                  {isStarred && <Ionicons name="star" size={10} color="#F1A167" style={{ marginRight: 2 }} />}
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
                {isStarred && <Ionicons name="star" size={10} color="#F1A167" style={{ marginRight: 2 }} />}
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

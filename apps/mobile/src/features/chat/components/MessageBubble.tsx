import { useState, useEffect, useRef, memo } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing, Platform, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { formatMessageTime } from '@/shared/utils';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { DateSeparator } from './DateSeparator';
import { SystemEventBar } from './SystemEventBar';
import { ImageViewer } from './ImageViewer';
import { VideoViewer } from './VideoViewer';
import { DocumentViewer } from './DocumentViewer';
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
  onReplyPress?: (replyToId: string) => void;
  resolveName?: (userId: string) => string | null;
  resolveAvatar?: (userId: string) => string | null;
  onAvatarPress?: (userId: string) => void;
}

export const MessageBubble = memo(function MessageBubble({
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
  onReplyPress,
  resolveName,
  resolveAvatar,
  onAvatarPress,
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

  const [viewingImage,    setViewingImage]    = useState<string | null>(null);
  const [viewingVideo,    setViewingVideo]    = useState<string | null>(null);
  const [viewingDocument, setViewingDocument] = useState<string | null>(null);
  const [imgError,        setImgError]        = useState(false);

  const handleDocumentTap = (url: string) => {
    if (Platform.OS !== 'web') {
      Linking.openURL(url);
      return;
    }
    if (url.toLowerCase().endsWith('.pdf')) {
      setViewingDocument(url);
      return;
    }
    // Non-PDF on web (.doc, .docx, …) — browser download, no modal
    window.open(url, '_blank', 'noopener,noreferrer');
  };

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

  const timeLabel = message.blockedByRecipient
    ? formatMessageTime(message.createdAt)
    : message.failed
    ? 'Failed — tap to retry'
    : message.pending
    ? 'Sending…'
    : formatMessageTime(message.createdAt);

  // Ticks shown only for my messages in 1-on-1 chats
  const ticks = isMine && !isGroup ? (
    message.blockedByRecipient ? (
      <Ionicons name="checkmark" size={13} color="#9E9E9E" />
    ) : message.failed ? (
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

  const isMedia    = message.type === 'image'      && !!message.mediaUrl;
  const isVoice    = message.type === 'voice_note' && !!message.mediaUrl;
  const isVideo    = message.type === 'video'      && !!message.mediaUrl;
  const isDocument = message.type === 'document'   && !!message.mediaUrl;

  return (
    <>
      {showDate && <DateSeparator dateStr={message.createdAt} />}

      <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
        {showAvatarCol && (
          <View style={styles.avatarColumn}>
            {isTail ? (
              <Pressable onPress={() => onAvatarPress?.(message.senderId)} disabled={!onAvatarPress}>
                <Avatar uri={avatarUri} name={avatarName} size={28} />
              </Pressable>
            ) : (
              <View style={styles.avatarSpacer} />
            )}
          </View>
        )}
        <Pressable
          style={{ maxWidth: showAvatarCol ? '72%' : '78%', minWidth: 72 }}
          onPress={message.failed && !message.blockedByRecipient && onRetryFailed ? () => onRetryFailed(message) : undefined}
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
                  borderRadius: 16,
                  borderBottomRightRadius: isMine ? 4 : 16,
                  borderBottomLeftRadius: isMine ? 16 : 4,
                },
              ]}
              pointerEvents="none"
            />
            {showSender && (
              <Text style={styles.senderName}>{resolveName?.(message.senderId) ?? message.sender?.name ?? 'Unknown'}</Text>
            )}

            {message.replyTo && (
              <Pressable
                onPress={() => onReplyPress?.(message.replyTo!.id)}
                style={[styles.replyBar, isMine && styles.replyBarMine]}
              >
                <Text style={styles.replyText} numberOfLines={2}>
                  {message.replyTo.type === 'voice_note'
                    ? 'Voice note'
                    : (message.replyTo.content ?? message.replyTo.type)}
                </Text>
              </Pressable>
            )}

            {message.isForwarded && !message.isDeleted && (
              <View style={styles.forwardedLabel}>
                <Ionicons name="arrow-redo-outline" size={11} color="#888888" />
                <Text style={styles.forwardedText}>Forwarded</Text>
              </View>
            )}

            {/* ── Image ─────────────────────────────────────────────────── */}
            {isMedia ? (
              <>
                <Pressable onPress={() => !imgError && setViewingImage(message.mediaUrl)}>
                  {imgError ? (
                    <View style={[styles.mediaBubble, mediaBrokenStyle.wrap]}>
                      <Ionicons name="image-outline" size={32} color="#ccc" />
                    </View>
                  ) : (
                    <View style={styles.mediaBubble}>
                      <Image
                        source={message.mediaUrl!}
                        style={{ width: 200, height: 160, borderRadius: 10 }}
                        contentFit="cover"
                        transition={200}
                        cachePolicy="memory-disk"
                        recyclingKey={message.mediaUrl!}
                        onError={() => setImgError(true)}
                      />
                    </View>
                  )}
                </Pressable>
                {!!message.content && (
                  <Text style={styles.captionText}>{message.content}</Text>
                )}
              </>

            /* ── Voice note ───────────────────────────────────────────── */
            ) : isVoice ? (
              <VoiceNotePlayer
                uri={message.mediaUrl!}
                isMine={isMine}
                accentColor={accentColor}
                initialDurationMs={message.type === 'voice_note' && message.content ? Number(message.content) || undefined : undefined}
              />

            /* ── Video ────────────────────────────────────────────────── */
            ) : isVideo ? (
              <>
                <Pressable onPress={() => setViewingVideo(message.mediaUrl!)}>
                  <View style={[styles.mediaBubble, styles.videoBubble]}>
                    <Ionicons name="play-circle-outline" size={48} color="#fff" />
                    <Text style={styles.videoLabel}>Video</Text>
                  </View>
                </Pressable>
                {!!message.content && (
                  <Text style={styles.captionText}>{message.content}</Text>
                )}
              </>

            /* ── Document ─────────────────────────────────────────────── */
            ) : isDocument ? (
              <Pressable onPress={() => handleDocumentTap(message.mediaUrl!)} style={styles.documentBubble}>
                <Ionicons name="document-outline" size={28} color={accentColor} />
                <Text style={styles.documentLabel} numberOfLines={1}>
                  {message.content || 'Document'}
                </Text>
              </Pressable>

            /* ── Text ─────────────────────────────────────────────────── */
            ) : (
              <View>
                <Text style={[
                  styles.msgText,
                  isMine ? styles.msgTextMine : styles.msgTextTheirs,
                  { fontSize: fontSizePt },
                  message.isDeleted && styles.msgTextDeleted,
                ]}>
                  {message.isDeleted ? 'This message was deleted' : message.content}
                </Text>
                <View style={styles.msgMeta}>
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
            {(isMedia || isVoice || isVideo || isDocument) && (
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
      <VideoViewer uri={viewingVideo} onClose={() => setViewingVideo(null)} />
      <DocumentViewer uri={viewingDocument} onClose={() => setViewingDocument(null)} />
    </>
  );
});

const mediaBrokenStyle = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0' },
});

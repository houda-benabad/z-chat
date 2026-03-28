import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '../theme';
import { chatApi, ChatMessage, tokenStorage } from '../services/api';
import { getSocket } from '../services/socket';

function formatMessageTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

interface TypingUser {
  userId: string;
  timeout: ReturnType<typeof setTimeout>;
}

export default function ChatScreen() {
  const { chatId, name, recipientId } = useLocalSearchParams<{
    chatId: string;
    name: string;
    recipientId: string;
  }>();
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [myUserId, setMyUserId] = useState('');
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(new Map());
  const [isOnline, setIsOnline] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Load userId from token
  useEffect(() => {
    tokenStorage.get().then((token) => {
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]!));
          setMyUserId(payload.sub);
        } catch {
          // Ignore
        }
      }
    });
  }, []);

  // Load initial messages
  const loadMessages = useCallback(async () => {
    if (!chatId) return;
    try {
      const data = await chatApi.getMessages(chatId);
      setMessages(data.messages.reverse()); // API returns newest first, we want oldest first
      setNextCursor(data.nextCursor);
    } catch {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  // Load older messages
  const loadOlderMessages = useCallback(async () => {
    if (!chatId || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await chatApi.getMessages(chatId, nextCursor);
      setMessages((prev) => [...data.messages.reverse(), ...prev]);
      setNextCursor(data.nextCursor);
    } catch {
      // Ignore
    } finally {
      setLoadingMore(false);
    }
  }, [chatId, nextCursor, loadingMore]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Socket events
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !chatId) return;

    const handleNewMessage = (message: ChatMessage) => {
      if (message.chatId !== chatId) return;
      setMessages((prev) => {
        // Deduplicate
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });

      // Mark as read
      socket.emit('message:read', { chatId, messageId: message.id });
    };

    const handleTypingStart = (data: { chatId: string; userId: string }) => {
      if (data.chatId !== chatId || data.userId === myUserId) return;
      setTypingUsers((prev) => {
        const next = new Map(prev);
        const existing = next.get(data.userId);
        if (existing) clearTimeout(existing.timeout);
        const timeout = setTimeout(() => {
          setTypingUsers((p) => {
            const n = new Map(p);
            n.delete(data.userId);
            return n;
          });
        }, 3000);
        next.set(data.userId, { userId: data.userId, timeout });
        return next;
      });
    };

    const handleTypingStop = (data: { chatId: string; userId: string }) => {
      if (data.chatId !== chatId) return;
      setTypingUsers((prev) => {
        const next = new Map(prev);
        const existing = next.get(data.userId);
        if (existing) clearTimeout(existing.timeout);
        next.delete(data.userId);
        return next;
      });
    };

    const handleUserOnline = (data: { userId: string }) => {
      if (data.userId === recipientId) setIsOnline(true);
    };

    const handleUserOffline = (data: { userId: string }) => {
      if (data.userId === recipientId) setIsOnline(false);
    };

    socket.on('message:new', handleNewMessage);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);

    // Mark latest message as read on open
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.senderId !== myUserId) {
        socket.emit('message:read', { chatId, messageId: lastMsg.id });
      }
    }

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
    };
  }, [chatId, myUserId, recipientId, messages]);

  const handleSend = useCallback(() => {
    const content = inputText.trim();
    if (!content || !chatId) return;

    const socket = getSocket();
    if (!socket) return;

    socket.emit(
      'message:send',
      { chatId, type: 'text', content },
      (response: { message?: ChatMessage; error?: string }) => {
        if (response.error) {
          // Could show an alert here
          return;
        }
      },
    );

    setInputText('');

    // Stop typing indicator
    socket.emit('typing:stop', { chatId });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [inputText, chatId]);

  const handleTextChange = useCallback(
    (text: string) => {
      setInputText(text);

      const socket = getSocket();
      if (!socket || !chatId) return;

      if (text.length > 0) {
        socket.emit('typing:start', { chatId });

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit('typing:stop', { chatId });
          typingTimeoutRef.current = null;
        }, 2000);
      } else {
        socket.emit('typing:stop', { chatId });
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
      }
    },
    [chatId],
  );

  const renderMessage = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => {
      const isMine = item.senderId === myUserId;
      const prevMsg = index > 0 ? messages[index - 1] : null;
      const showDateSep = !prevMsg || !isSameDay(prevMsg.createdAt, item.createdAt);

      return (
        <>
          {showDateSep && (
            <View style={styles.dateSeparator}>
              <View style={styles.dateLine} />
              <Text style={styles.dateText}>
                {formatDateSeparator(item.createdAt)}
              </Text>
              <View style={styles.dateLine} />
            </View>
          )}
          <View
            style={[
              styles.messageBubbleRow,
              isMine ? styles.messageBubbleRowMine : styles.messageBubbleRowTheirs,
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                isMine ? styles.messageBubbleMine : styles.messageBubbleTheirs,
              ]}
            >
              {item.replyTo && (
                <View style={styles.replyContainer}>
                  <Text style={styles.replyText} numberOfLines={1}>
                    {item.replyTo.content ?? item.replyTo.type}
                  </Text>
                </View>
              )}
              <Text
                style={[
                  styles.messageText,
                  isMine ? styles.messageTextMine : styles.messageTextTheirs,
                ]}
              >
                {item.content}
              </Text>
              <View style={styles.messageFooter}>
                <Text
                  style={[
                    styles.messageTime,
                    isMine ? styles.messageTimeMine : styles.messageTimeTheirs,
                  ]}
                >
                  {formatMessageTime(item.createdAt)}
                </Text>
                {isMine && (
                  <Text style={styles.readReceipt}>
                    {'\u2713\u2713'}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </>
      );
    },
    [myUserId, messages],
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isTyping = typingUsers.size > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>{'\u2190'}</Text>
        </Pressable>
        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {(name ?? '?')[0]?.toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.headerName} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.headerStatus}>
              {isTyping ? 'typing...' : isOnline ? 'online' : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }}
        onStartReached={loadOlderMessages}
        onStartReachedThreshold={0.1}
        ListHeaderComponent={
          loadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyMessages}>
            <Text style={styles.emptyMessagesText}>
              Send a message to start the conversation
            </Text>
          </View>
        }
      />

      {/* Typing indicator */}
      {isTyping && (
        <View style={styles.typingBar}>
          <Text style={styles.typingText}>{name} is typing...</Text>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Message"
          placeholderTextColor={colors.textSecondary}
          value={inputText}
          onChangeText={handleTextChange}
          multiline
          maxLength={4096}
        />
        <Pressable
          style={[
            styles.sendButton,
            !inputText.trim() && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendButtonText}>{'\u2191'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.xs,
  },
  backArrow: {
    fontSize: 24,
    color: colors.primary,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  headerAvatarText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
  headerName: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  headerStatus: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    color: colors.success,
  },
  messageList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexGrow: 1,
  },
  loadingMore: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  emptyMessages: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyMessagesText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dateText: {
    marginHorizontal: spacing.md,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  messageBubbleRow: {
    marginBottom: 4,
  },
  messageBubbleRowMine: {
    alignItems: 'flex-end',
  },
  messageBubbleRowTheirs: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: borderRadius.lg,
  },
  messageBubbleMine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  messageBubbleTheirs: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
  },
  replyContainer: {
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary,
    paddingLeft: spacing.sm,
    marginBottom: 6,
    opacity: 0.8,
  },
  replyText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
  },
  messageText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    lineHeight: 22,
  },
  messageTextMine: {
    color: colors.white,
  },
  messageTextTheirs: {
    color: colors.text,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  messageTime: {
    fontSize: 10,
    fontFamily: typography.fontFamily,
  },
  messageTimeMine: {
    color: 'rgba(255,255,255,0.7)',
  },
  messageTimeTheirs: {
    color: colors.textSecondary,
  },
  readReceipt: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  typingBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
  },
  typingText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    fontStyle: 'italic',
    color: colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 120,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
  },
  sendButtonText: {
    fontSize: 20,
    color: colors.white,
    fontWeight: typography.weights.bold,
  },
});

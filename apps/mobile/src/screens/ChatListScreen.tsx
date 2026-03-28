import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, typography } from '../theme';
import { chatApi, ChatListItem, ChatParticipantUser, tokenStorage } from '../services/api';
import { connectSocket, getSocket, disconnectSocket } from '../services/socket';
import type { Socket } from 'socket.io-client';

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getOtherUser(
  participants: ChatListItem['participants'],
  myUserId: string,
): ChatParticipantUser | null {
  const other = participants.find((p) => p.userId !== myUserId);
  return other?.user ?? null;
}

export default function ChatListScreen() {
  const router = useRouter();
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myUserId, setMyUserId] = useState('');
  const socketRef = useRef<Socket | null>(null);

  const loadChats = useCallback(async () => {
    try {
      const { chats: data } = await chatApi.getChats();
      setChats(data);
    } catch {
      // Silently handle — will retry on refresh
    }
  }, []);

  const setupSocket = useCallback(async () => {
    try {
      const sock = await connectSocket();
      socketRef.current = sock;

      // Extract userId from token (simple decode)
      const token = await tokenStorage.get();
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]!));
        setMyUserId(payload.sub);
      }

      sock.on('message:new', () => {
        // Reload chat list to update last message and unread counts
        loadChats();
      });

      sock.on('message:read', () => {
        loadChats();
      });

      sock.on('user:online', () => {
        loadChats();
      });

      sock.on('user:offline', () => {
        loadChats();
      });
    } catch {
      // Will retry on pull-to-refresh
    }
  }, [loadChats]);

  useEffect(() => {
    const init = async () => {
      // Extract userId
      const token = await tokenStorage.get();
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]!));
          setMyUserId(payload.sub);
        } catch {
          // Ignore
        }
      }

      await loadChats();
      setLoading(false);
      await setupSocket();
    };

    init();

    return () => {
      disconnectSocket();
    };
  }, [loadChats, setupSocket]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadChats();
    setRefreshing(false);
  }, [loadChats]);

  const renderChat = useCallback(
    ({ item }: { item: ChatListItem }) => {
      const otherUser = getOtherUser(item.participants, myUserId);
      const displayName = otherUser?.name ?? otherUser?.phone ?? 'Unknown';
      const lastMsg = item.lastMessage;
      const isOnline = otherUser?.isOnline ?? false;

      let preview = '';
      if (lastMsg) {
        if (lastMsg.type === 'text') {
          preview = lastMsg.content ?? '';
        } else {
          const typeLabels: Record<string, string> = {
            image: 'Photo',
            video: 'Video',
            audio: 'Audio',
            document: 'Document',
            voice_note: 'Voice note',
          };
          preview = typeLabels[lastMsg.type] ?? lastMsg.type;
        }
      }

      return (
        <Pressable
          style={({ pressed }) => [styles.chatItem, pressed && styles.chatItemPressed]}
          onPress={() =>
            router.push({
              pathname: '/chat',
              params: {
                chatId: item.id,
                name: displayName,
                recipientId: otherUser?.id ?? '',
              },
            })
          }
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {displayName[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
            {isOnline && <View style={styles.onlineDot} />}
          </View>

          <View style={styles.chatContent}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatName} numberOfLines={1}>
                {displayName}
              </Text>
              {lastMsg && (
                <Text
                  style={[
                    styles.chatTime,
                    item.unreadCount > 0 && styles.chatTimeUnread,
                  ]}
                >
                  {formatTime(lastMsg.createdAt)}
                </Text>
              )}
            </View>
            <View style={styles.chatFooter}>
              <Text style={styles.chatPreview} numberOfLines={1}>
                {lastMsg?.senderId === myUserId ? `You: ${preview}` : preview}
              </Text>
              {item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>
                    {item.unreadCount > 99 ? '99+' : item.unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {item.isPinned && (
            <Text style={styles.pinIcon}>
              {'\u{1F4CC}'}
            </Text>
          )}
        </Pressable>
      );
    },
    [myUserId, router],
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>z.chat</Text>
        <Pressable
          style={styles.newChatButton}
          onPress={() => router.push('/new-chat')}
        >
          <Text style={styles.newChatButtonText}>+</Text>
        </Pressable>
      </View>

      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={renderChat}
        contentContainerStyle={chats.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap + to start a new chat
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />
    </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  newChatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newChatButtonText: {
    fontSize: 24,
    color: colors.white,
    fontWeight: typography.weights.bold,
    marginTop: -2,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    backgroundColor: colors.background,
  },
  chatItemPressed: {
    backgroundColor: colors.surface,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background,
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginRight: spacing.sm,
  },
  chatTime: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
  },
  chatTimeUnread: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatPreview: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 11,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  pinIcon: {
    fontSize: 14,
    marginLeft: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
  },
});

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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, typography } from '../theme';
import { chatApi, ChatListItem, ChatParticipantUser, tokenStorage } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import type { Socket } from 'socket.io-client';

type TabName = 'chats' | 'calls' | 'settings';

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
  const insets = useSafeAreaInsets();
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myUserId, setMyUserId] = useState('');
  const [activeTab, setActiveTab] = useState<TabName>('chats');
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
      const isGroup = item.type === 'group';
      const otherUser = isGroup ? null : getOtherUser(item.participants, myUserId);
      const displayName = isGroup
        ? (item.name ?? 'Group')
        : (otherUser?.name ?? otherUser?.phone ?? 'Unknown');
      const lastMsg = item.lastMessage;
      const isOnline = isGroup ? false : (otherUser?.isOnline ?? false);

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
        // In groups, prefix with sender name
        if (isGroup && lastMsg.sender) {
          const senderName = lastMsg.senderId === myUserId
            ? 'You'
            : (lastMsg.sender.name ?? 'Unknown');
          preview = `${senderName}: ${preview}`;
        } else if (!isGroup && lastMsg.senderId === myUserId) {
          preview = `You: ${preview}`;
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
                ...(isGroup
                  ? { chatType: 'group' }
                  : { recipientId: otherUser?.id ?? '' }),
              },
            })
          }
        >
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, isGroup && styles.groupAvatar]}>
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
                {preview}
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

  const NAV_HEIGHT = 64 + insets.bottom;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>z.chat</Text>
        <Pressable
          style={styles.newChatButton}
          onPress={() => router.push('/new-chat')}
        >
          <Ionicons name="create-outline" size={22} color={colors.white} />
        </Pressable>
      </View>

      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={renderChat}
        contentContainerStyle={[
          chats.length === 0 ? styles.emptyContainer : undefined,
          { paddingBottom: NAV_HEIGHT + 72 },
        ]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={56} color={colors.border} style={{ marginBottom: 16, opacity: 0.4 }} />
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySubtitle}>Tap the button below to start a new chat</Text>
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

      {/* FAB */}
      <Pressable
        style={[styles.fab, { bottom: NAV_HEIGHT + 16 }]}
        onPress={() => router.push('/new-chat')}
      >
        <Ionicons name="chatbubble-outline" size={24} color={colors.white} />
      </Pressable>

      {/* Bottom Navbar */}
      <View style={[styles.navbar, { paddingBottom: insets.bottom || 12 }]}>
        {([
          { key: 'chats', label: 'Chats', icon: 'chatbubble-outline', iconActive: 'chatbubble' },
          { key: 'calls', label: 'Calls', icon: 'call-outline', iconActive: 'call' },
          { key: 'settings', label: 'Settings', icon: 'settings-outline', iconActive: 'settings' },
        ] as const).map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={styles.navTab}
              onPress={() => {
                setActiveTab(tab.key);
                if (tab.key === 'settings') router.push('/settings');
              }}
            >
              <Ionicons
                name={isActive ? tab.iconActive : tab.icon}
                size={24}
                color={isActive ? colors.primary : '#999'}
              />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {tab.label}
              </Text>
              {isActive && <View style={styles.navDot} />}
            </Pressable>
          );
        })}
      </View>
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  navbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 16,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingTop: 4,
  },
  navLabel: {
    fontSize: 11,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.medium,
    color: '#999',
  },
  navLabelActive: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  navDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 1,
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
  groupAvatar: {
    backgroundColor: colors.primary,
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

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, typography } from '../theme';
import {
  chatApi,
  userApi,
  ChatListItem,
  ChatMessage,
  ChatParticipantUser,
  UserProfile,
  tokenStorage,
} from '../services/api';
import { connectSocket } from '../services/socket';
import type { Socket } from 'socket.io-client';

type TabName = 'chats' | 'calls' | 'settings';

const SETTINGS_SECTIONS: { title: string; rows: { label: string; subtitle?: string; icon: string; route: string }[] }[] = [
  {
    title: '',
    rows: [
      { label: 'Account', subtitle: 'Privacy, security, change number', icon: '🔑', route: '/settings-account' },
    ],
  },
  {
    title: 'Preferences',
    rows: [
      { label: 'Privacy', subtitle: 'Last seen, read receipts, blocked', icon: '🔒', route: '/settings-privacy' },
      { label: 'Notifications', subtitle: 'Message, group, call alerts', icon: '🔔', route: '/settings-notifications' },
      { label: 'Storage & Data', subtitle: 'Auto-download, data usage', icon: '💾', route: '/settings-storage' },
      { label: 'Appearance', subtitle: 'Theme, accent color, font size', icon: '🎨', route: '/settings-appearance' },
    ],
  },
  {
    title: 'Support',
    rows: [
      { label: 'Help', subtitle: 'FAQ, contact us, terms & privacy', icon: '❓', route: '/settings-help' },
    ],
  },
];

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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const chatsRef = useRef<ChatListItem[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const loadChats = useCallback(async () => {
    try {
      const { chats: data } = await chatApi.getChats();
      chatsRef.current = data;
      setChats(data);
    } catch {
      // Silently handle — will retry on refresh
    }
  }, []);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const { user } = await userApi.getMe();
      setProfile(user);
    } catch { /* ignore */ }
    finally { setProfileLoading(false); }
  }, []);

  const setupSocket = useCallback(async (): Promise<(() => void) | undefined> => {
    try {
      const sock = await connectSocket();
      socketRef.current = sock;

      const token = await tokenStorage.get();
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]!));
        setMyUserId(payload.sub);
      }

      const handleMessageNew = (message: ChatMessage) => {
        if (!chatsRef.current.some(c => c.id === message.chatId)) {
          loadChats();
          return;
        }
        setChats((prev) => {
          const updated = prev.map((chat) =>
            chat.id === message.chatId
              ? { ...chat, lastMessage: message, updatedAt: message.createdAt }
              : chat
          );
          return updated.sort((a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        });
      };

      const handleChatNew = () => { loadChats(); };
      const handleMessageRead = () => { loadChats(); };

      const handleUserOnline = ({ userId }: { userId: string }) => {
        setChats((prev) =>
          prev.map((chat) => ({
            ...chat,
            participants: chat.participants.map((p) =>
              p.userId === userId ? { ...p, user: { ...p.user, isOnline: true } } : p
            ),
          }))
        );
      };

      const handleUserOffline = ({ userId }: { userId: string }) => {
        setChats((prev) =>
          prev.map((chat) => ({
            ...chat,
            participants: chat.participants.map((p) =>
              p.userId === userId ? { ...p, user: { ...p.user, isOnline: false } } : p
            ),
          }))
        );
      };

      sock.on('message:new', handleMessageNew);
      sock.on('message:read', handleMessageRead);
      sock.on('user:online', handleUserOnline);
      sock.on('user:offline', handleUserOffline);
      sock.on('chat:new', handleChatNew);

      return () => {
        sock.off('message:new', handleMessageNew);
        sock.off('message:read', handleMessageRead);
        sock.off('user:online', handleUserOnline);
        sock.off('user:offline', handleUserOffline);
        sock.off('chat:new', handleChatNew);
      };
    } catch {
      // Will retry on pull-to-refresh
    }
  }, [loadChats]);

  useEffect(() => {
    let removeListeners: (() => void) | undefined;

    const init = async () => {
      const token = await tokenStorage.get();
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]!));
          setMyUserId(payload.sub);
        } catch { /* ignore */ }
      }

      await Promise.all([loadChats(), loadProfile()]);
      setLoading(false);
      removeListeners = await setupSocket();
    };

    init();
    return () => { removeListeners?.(); };
  }, [loadChats, loadProfile, setupSocket]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadChats();
    setRefreshing(false);
  }, [loadChats]);

  const handleLogout = useCallback(async () => {
    await tokenStorage.remove();
    router.replace('/');
  }, [router]);

  const handleDeleteConversation = useCallback(async (chatId: string) => {
    setDeleteTarget(null);
    try {
      await chatApi.deleteConversation(chatId);
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      chatsRef.current = chatsRef.current.filter((c) => c.id !== chatId);
    } catch { /* ignore */ }
  }, []);

  const renderChat = useCallback(
    ({ item }: { item: ChatListItem }) => {
      const isGroup = item.type === 'group';
      const otherUser = isGroup ? null : getOtherUser(item.participants, myUserId);
      const displayName = isGroup
        ? (item.name ?? 'Group')
        : (otherUser?.name ?? otherUser?.phone ?? 'Unknown');
      const lastMsg = item.lastMessage;
      const isOnline = isGroup ? false : (otherUser?.isOnline ?? false);
      const avatarUri = isGroup ? item.avatar : (otherUser?.avatar ?? null);

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
                  ? { chatType: 'group', recipientAvatar: item.avatar ?? '' }
                  : { recipientId: otherUser?.id ?? '', recipientAvatar: otherUser?.avatar ?? '' }),
              },
            })
          }
          onLongPress={() => setDeleteTarget({ id: item.id, name: displayName })}
          delayLongPress={400}
        >
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, isGroup && styles.groupAvatar]}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {displayName[0]?.toUpperCase() ?? '?'}
                </Text>
              )}
            </View>
            {isOnline && <View style={styles.onlineDot} />}
          </View>

          <View style={styles.chatContent}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatName} numberOfLines={1}>
                {displayName}
              </Text>
              {lastMsg && (
                <Text style={[styles.chatTime, item.unreadCount > 0 && styles.chatTimeUnread]}>
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
            <Text style={styles.pinIcon}>{'\u{1F4CC}'}</Text>
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
      {/* Dynamic header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        {activeTab === 'settings' ? (
          <Text style={styles.headerTitle}>Settings</Text>
        ) : (
          <>
            <Text style={styles.headerTitle}>z.chat</Text>
            <Pressable
              style={styles.newChatButton}
              onPress={() => router.push('/new-chat')}
            >
              <Ionicons name="create-outline" size={22} color={colors.white} />
            </Pressable>
          </>
        )}
      </View>

      {/* Chats tab */}
      {activeTab === 'chats' && (
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
      )}

      {/* Calls tab placeholder */}
      {activeTab === 'calls' && (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyState}>
            <Ionicons name="call-outline" size={56} color={colors.border} style={{ marginBottom: 16, opacity: 0.4 }} />
            <Text style={styles.emptyTitle}>No calls yet</Text>
            <Text style={styles.emptySubtitle}>Voice and video calls will appear here</Text>
          </View>
        </View>
      )}

      {/* Settings tab — inline, no navigation */}
      {activeTab === 'settings' && (
        <ScrollView
          contentContainerStyle={{ paddingBottom: NAV_HEIGHT + 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile card */}
          <Pressable
            style={({ pressed }) => [styles.profileCard, pressed && styles.pressed]}
            onPress={() => router.push('/settings-profile')}
          >
            <View style={styles.profileAvatar}>
              {profileLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : profile?.avatar ? (
                <Image source={{ uri: profile.avatar }} style={styles.profileAvatarImage} />
              ) : (
                <Text style={styles.profileAvatarText}>
                  {profile?.name?.[0]?.toUpperCase() ?? '?'}
                </Text>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile?.name ?? 'Set up your name'}</Text>
              <Text style={styles.profileAbout} numberOfLines={1}>
                {profile?.phone ?? profile?.about ?? 'Hey there! I am using z.chat'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </Pressable>

          {/* Settings sections */}
          {SETTINGS_SECTIONS.map((section, si) => (
            <View key={si} style={styles.section}>
              {section.title ? (
                <Text style={styles.sectionTitle}>{section.title}</Text>
              ) : null}
              {section.rows.map((row) => (
                <Pressable
                  key={row.route}
                  style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}
                  onPress={() => router.push(row.route as any)}
                >
                  <Text style={styles.rowIcon}>{row.icon}</Text>
                  <View style={styles.rowContent}>
                    <Text style={styles.rowLabel}>{row.label}</Text>
                    {row.subtitle && (
                      <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </Pressable>
              ))}
            </View>
          ))}

          {/* Logout */}
          <View style={styles.section}>
            <Pressable
              style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}
              onPress={handleLogout}
            >
              <Text style={[styles.rowIcon, { color: '#ED2F3C' }]}>↩</Text>
              <Text style={styles.logoutLabel}>Log Out</Text>
            </Pressable>
          </View>

          <View style={styles.appInfo}>
            <Text style={styles.appInfoText}>z.chat by z.systems</Text>
            <Text style={styles.appInfoVersion}>Version 1.0.0</Text>
          </View>
        </ScrollView>
      )}

      {/* FAB — chats tab only */}
      {activeTab === 'chats' && (
        <Pressable
          style={[styles.fab, { bottom: NAV_HEIGHT + 16 }]}
          onPress={() => router.push('/new-chat')}
        >
          <Ionicons name="chatbubble-outline" size={24} color={colors.white} />
        </Pressable>
      )}

      {/* Delete conversation confirmation modal */}
      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setDeleteTarget(null)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete conversation</Text>
            <Text style={styles.modalBody}>
              Delete your chat with{' '}
              <Text style={{ fontWeight: '600' }}>{deleteTarget?.name}</Text>?{'\n'}
              This only removes it from your view. They keep their history.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setDeleteTarget(null)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnDelete]}
                onPress={() => deleteTarget && handleDeleteConversation(deleteTarget.id)}
              >
                <Text style={styles.modalBtnDeleteText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

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
              onPress={() => setActiveTab(tab.key)}
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

  // Header
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

  // Chat list
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
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
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

  // FAB
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

  // Bottom Navbar
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

  // Settings tab
  pressed: {
    backgroundColor: colors.surface,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 8,
    borderBottomColor: colors.surface,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  profileAvatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  profileAvatarText: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  profileAbout: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
    marginTop: 2,
  },
  section: {
    borderBottomWidth: 8,
    borderBottomColor: colors.surface,
  },
  sectionTitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  rowIcon: {
    fontSize: 22,
    width: 36,
    textAlign: 'center',
    marginRight: spacing.md,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  rowSubtitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
    marginTop: 1,
  },
  logoutLabel: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.medium,
    color: '#ED2F3C',
    flex: 1,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  appInfoText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
  },
  appInfoVersion: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    color: colors.border,
    marginTop: 2,
  },

  // Delete modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 10,
  },
  modalBody: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: colors.surface,
  },
  modalBtnCancelText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  modalBtnDelete: {
    backgroundColor: '#ED2F3C',
  },
  modalBtnDeleteText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: '#fff',
  },
});

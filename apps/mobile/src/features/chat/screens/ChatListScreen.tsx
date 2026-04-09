import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { tokenStorage } from '@/shared/services/api';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import { disconnectSocket } from '@/shared/services/socket';
import { useCurrentUser, clearCurrentUserIdCache } from '@/shared/hooks';
import { APP_NAME, NAV_TABS } from '@/constants';
import { LoadingScreen, Snackbar } from '@/shared/components';
import { useChatList } from '../hooks/useChatList';
import { useChatListProfile } from '../hooks/useChatListProfile';
import { ChatsTab } from '../components/ChatsTab';
import { CallsTab } from '../components/CallsTab';
import { SettingsTab } from '../components/SettingsTab';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { createStyles } from './styles/ChatListScreen.styles';

type TabName = (typeof NAV_TABS)[number]['key'];

export default function ChatListScreen() {
  const styles = useThemedStyles(createStyles);
  const { appColors } = useAppSettings();
  const router      = useRouter();
  const insets      = useSafeAreaInsets();
  const { userId: myUserId } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<TabName>('chats');
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  useEffect(() => {
    if (tab === 'chats') setActiveTab('chats');
  }, [tab]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<TextInput>(null);

  const { chats, nicknames, loading, refreshing, loadingMore, hasMore, pendingDelete, loadChats, loadNicknames, loadMore, onRefresh, deleteConversation, markAsRead } =
    useChatList(myUserId);

  const { profile, loading: profileLoading } = useChatListProfile();

  useFocusEffect(useCallback(() => { loadChats(); loadNicknames(); }, [loadChats, loadNicknames]));

  const handleLogout = useCallback(async () => {
    clearCurrentUserIdCache();
    disconnectSocket();
    await tokenStorage.remove();
    router.replace('/');
  }, [router]);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
    setTimeout(() => searchRef.current?.focus(), 50);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
  }, []);

  // Filter chats by display name or preview
  const filteredChats = searchQuery.trim()
    ? chats.filter((c) => {
        const q = searchQuery.toLowerCase();
        const isGroup = c.type === 'group';
        const otherParticipant = isGroup
          ? null
          : c.participants.find((p) => p.userId !== myUserId)?.user ?? null;
        const inContacts  = otherParticipant ? nicknames.has(otherParticipant.id) : false;
        const nickname    = otherParticipant ? (nicknames.get(otherParticipant.id) ?? null) : null;
        const displayName = isGroup
          ? (c.name ?? 'Group')
          : inContacts
            ? (nickname ?? otherParticipant?.name ?? '')
            : (otherParticipant?.phone ?? '');
        return displayName.toLowerCase().includes(q);
      })
    : chats;

  if (loading) return <LoadingScreen />;

  const NAV_HEIGHT = 56 + insets.bottom;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        {searchOpen ? (
          /* Search mode header */
          <>
            <Pressable onPress={closeSearch} style={styles.headerIconBtn}>
              <Ionicons name="arrow-back" size={24} color={appColors.text} />
            </Pressable>
            <TextInput
              ref={searchRef}
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor={appColors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoFocus
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} style={styles.headerIconBtn}>
                <Ionicons name="close-circle" size={20} color={appColors.textSecondary} />
              </Pressable>
            )}
          </>
        ) : activeTab === 'settings' ? (
          /* Settings header */
          <>
            <Text style={styles.headerTitle}>Settings</Text>
          </>
        ) : (
          /* Default chats header */
          <>
            <Text style={styles.headerTitle}>{APP_NAME}</Text>
            <View style={styles.headerIcons}>
              <Pressable
                style={({ pressed }) => [styles.headerIconBtn, pressed && styles.headerIconBtnPressed]}
                onPress={openSearch}
              >
                <Ionicons name="search-outline" size={22} color={appColors.text} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.headerIconBtn, pressed && styles.headerIconBtnPressed]}
                onPress={() => router.push('/new-chat')}
              >
                <Ionicons name="create-outline" size={22} color={appColors.text} />
              </Pressable>
            </View>
          </>
        )}
      </View>

      {/* Active tab content */}
      {activeTab === 'chats' && (
        <ChatsTab
          chats={filteredChats}
          nicknames={nicknames}
          myUserId={myUserId}
          refreshing={refreshing}
          loadingMore={loadingMore}
          hasMore={hasMore}
          navHeight={NAV_HEIGHT}
          onRefresh={onRefresh}
          onDelete={deleteConversation}
          markAsRead={markAsRead}
          onLoadMore={loadMore}
        />
      )}
      {activeTab === 'calls' && <CallsTab />}
      {activeTab === 'settings' && (
        <SettingsTab
          profile={profile}
          profileLoading={profileLoading}
          navHeight={NAV_HEIGHT}
          onLogout={handleLogout}
        />
      )}

      {/* FAB — new chat (shown on chats tab only) */}
      {activeTab === 'chats' && !searchOpen && (
        <Pressable
          style={[styles.fab, { bottom: NAV_HEIGHT + 16 }]}
          onPress={() => router.push('/new-chat')}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={26} color="#fff" />
        </Pressable>
      )}

      {/* Undo delete snackbar */}
      {pendingDelete && (
        <Snackbar
          message="Conversation deleted"
          actionLabel="Undo"
          onAction={pendingDelete.undo}
          onDismiss={() => {}}
          duration={4000}
        />
      )}

      {/* Bottom navbar */}
      <View style={[styles.navbar, { paddingBottom: insets.bottom || 8 }]}>
        {NAV_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={styles.navTab}
              onPress={() => { setActiveTab(tab.key); closeSearch(); }}
            >
              {isActive && <View style={styles.navActiveBar} />}
              <Ionicons
                name={isActive ? tab.iconActive : tab.icon}
                size={24}
                color={isActive ? appColors.primary : appColors.textSecondary}
              />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

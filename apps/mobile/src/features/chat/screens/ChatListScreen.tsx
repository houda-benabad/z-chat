import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { View, Text, Pressable, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { tokenStorage } from '@/shared/services/api';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import { disconnectSocket } from '@/shared/services/socket';
import { useCurrentUser, clearCurrentUserIdCache } from '@/shared/hooks';
import { APP_NAME, NAV_TABS } from '@/constants';
import { LoadingScreen, Snackbar } from '@/shared/components';
import { useChatList, type ChatFilter } from '../hooks/useChatList';
import { useChatListProfile } from '../hooks/useChatListProfile';
import { ChatsTab } from '../components/ChatsTab';
import { ChatListItem } from '../components/ChatListItem';
import { ContactSearchItem } from '../components/ContactSearchItem';
import { CallsTab } from '../components/CallsTab';
import { SettingsTab } from '../components/SettingsTab';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { useBackgroundContactSync } from '@/features/contacts/hooks/useBackgroundContactSync';
import { createStyles } from './styles/ChatListScreen.styles';

type TabName = (typeof NAV_TABS)[number]['key'];

const FILTER_TABS: { key: ChatFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'groups', label: 'Groups' },
];

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

  const { chats, filteredChats: tabFilteredChats, chatFilter, setChatFilter, contacts, nicknames, loading, refreshing, loadingMore, hasMore, pendingDelete, loadChats, loadNicknames, loadMore, onRefresh, deleteConversation, markAsRead } =
    useChatList(myUserId);

  const { profile, loading: profileLoading } = useChatListProfile();
  useBackgroundContactSync();

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

  // Ref to disable swipe-to-delete in search results
  const searchSwipeRef = useRef(false);

  // Contacts not yet in any 1-on-1 chat
  const chatUserIdSet = useMemo(() => new Set(
    chats
      .filter((c) => c.type !== 'group')
      .map((c) => c.participants.find((p) => p.userId !== myUserId)?.userId)
      .filter((id): id is string => !!id),
  ), [chats, myUserId]);

  const otherContacts = useMemo(() =>
    contacts.filter((c) => !chatUserIdSet.has(c.contactUserId)),
  [contacts, chatUserIdSet]);

  const filteredOtherContacts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return otherContacts.filter((c) => {
      const name = (c.nickname ?? c.contactUser.name ?? '').toLowerCase();
      const phone = c.contactUser.phone.toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [otherContacts, searchQuery]);

  const handleSearchChatPress = useCallback((item: Parameters<typeof ChatListItem>[0]['item']) => {
    const isGroup = item.type === 'group';
    const otherUser = isGroup
      ? null
      : item.participants.find((p) => p.userId !== myUserId)?.user ?? null;
    const inContacts = otherUser ? nicknames.has(otherUser.id) : false;
    const nickname = otherUser ? (nicknames.get(otherUser.id) ?? null) : null;
    const displayName = isGroup
      ? (item.name ?? 'Group')
      : inContacts
        ? (nickname ?? otherUser?.name ?? 'Deleted Account')
        : (otherUser?.phone ?? 'Deleted Account');
    markAsRead(item.id);
    router.push({
      pathname: '/chat',
      params: {
        chatId: item.id,
        name: displayName,
        ...(isGroup
          ? { chatType: 'group', recipientAvatar: item.avatar ?? '' }
          : {
              recipientId: otherUser?.id ?? '',
              recipientAvatar: otherUser?.avatar ?? '',
              recipientIsOnline: otherUser?.isOnline ? '1' : '0',
            }),
      },
    });
  }, [myUserId, nicknames, markAsRead, router]);

  const handleContactPress = useCallback((contact: typeof contacts[number]) => {
    router.push({
      pathname: '/chat',
      params: {
        chatId: '',
        name: contact.nickname ?? contact.contactUser.name ?? contact.contactUser.phone,
        recipientId: contact.contactUserId,
        recipientAvatar: contact.contactUser.avatar ?? '',
        recipientIsOnline: contact.contactUser.isOnline ? '1' : '0',
      },
    });
  }, [router]);

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
            {activeTab === 'chats' && (
              <View style={styles.headerIcons}>
                <Pressable
                  style={({ pressed }) => [styles.headerIconBtn, pressed && styles.headerIconBtnPressed]}
                  onPress={openSearch}
                >
                  <Ionicons name="search-outline" size={22} color={appColors.textSecondary} />
                </Pressable>
              </View>
            )}
          </>
        )}
      </View>

      {/* Filter chips — chats tab, hidden during search */}
      {activeTab === 'chats' && !searchOpen && (
        <View style={styles.filterBar}>
          {FILTER_TABS.map((f) => (
            <Pressable
              key={f.key}
              style={({ pressed }) => [
                styles.filterChip,
                chatFilter === f.key && styles.filterChipActive,
                pressed && styles.filterChipPressed,
              ]}
              onPress={() => setChatFilter(f.key)}
            >
              <Text style={[styles.filterChipText, chatFilter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Active tab content */}
      {activeTab === 'chats' && searchOpen && searchQuery.trim() ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: NAV_HEIGHT }}>
          {filteredChats.length > 0 && (
            <>
              <Text style={styles.searchSectionHeader}>Chats</Text>
              {filteredChats.map((chat) => (
                <ChatListItem
                  key={chat.id}
                  item={chat}
                  nicknames={nicknames}
                  myUserId={myUserId}
                  onPress={handleSearchChatPress}
                  onDelete={() => {}}
                  onWillOpen={() => {}}
                  onClose={() => {}}
                  swipeActiveRef={searchSwipeRef}
                  onSwipeableRef={() => {}}
                />
              ))}
            </>
          )}
          {filteredOtherContacts.length > 0 && (
            <>
              <Text style={styles.searchSectionHeader}>Contacts</Text>
              {filteredOtherContacts.map((contact) => (
                <ContactSearchItem
                  key={contact.id}
                  contact={contact}
                  onPress={() => handleContactPress(contact)}
                />
              ))}
            </>
          )}
          {filteredChats.length === 0 && filteredOtherContacts.length === 0 && (
            <Text style={styles.searchNoResults}>No results</Text>
          )}
        </ScrollView>
      ) : activeTab === 'chats' ? (
        chatFilter !== 'all' && tabFilteredChats.length === 0 ? (
          <View style={styles.filterEmptyContainer}>
            <Text style={styles.filterEmptyText}>
              {chatFilter === 'unread' ? 'No unread chats' : 'No group chats'}
            </Text>
          </View>
        ) : (
          <ChatsTab
            chats={tabFilteredChats}
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
        )
      ) : null}
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
          <Ionicons name="add" size={26} color="#fff" />
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

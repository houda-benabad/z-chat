import { useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  SectionList,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { spacing, typography } from '@/theme';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { Avatar, EmptyState, LoadingScreen } from '@/shared/components';
import { useNewChat } from '../hooks/useNewChat';
import type { ContactItem } from '@/types';
import { getContactDisplayName } from '@/shared/utils';
import { createStyles } from './styles/NewChatScreen.styles';

export default function NewChatScreen() {
  const styles = useThemedStyles(createStyles);
  const { appColors } = useAppSettings();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    sections,
    search,
    setSearch,
    loading,
    loadError,
    refreshing,
    loadingMore,
    hasMore,
    syncing,
    openingId,
    searchRef,
    onRefresh,
    loadMore,
    handleSelectContact,
    handleSyncContacts,
  } = useNewChat();

  const q = search.toLowerCase().trim();

  const renderContact = useCallback((item: ContactItem) => {
    const displayName = getContactDisplayName(item);
    const subtitle = item.contactUser.about ?? item.contactUser.phone;
    const isOpening = openingId === item.id;

    return (
      <Pressable
        key={item.id}
        style={({ pressed }) => [styles.contactRow, pressed && styles.contactRowPressed]}
        onPress={() => handleSelectContact(item)}
        disabled={!!openingId}
      >
        <Avatar
          uri={item.contactUser.avatar}
          name={displayName}
          size={48}
          isOnline={item.contactUser.isOnline}
          style={styles.avatar}
        />
        <View style={styles.contactInfo}>
          <Text style={styles.contactName} numberOfLines={1}>{displayName}</Text>
          {!!subtitle && <Text style={styles.contactSub} numberOfLines={1}>{subtitle}</Text>}
        </View>
        {isOpening
          ? <ActivityIndicator size="small" color={appColors.primary} />
          : <Ionicons name="chevron-forward" size={16} color="#ccc" />
        }
      </Pressable>
    );
  }, [handleSelectContact, openingId]);

  if (loading) return <LoadingScreen />;

  if (loadError) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#555', marginBottom: 16, fontSize: 15 }}>Could not load contacts</Text>
        <Pressable
          onPress={onRefresh}
          style={{ paddingHorizontal: 24, paddingVertical: 10, backgroundColor: appColors.primary, borderRadius: 20 }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E46C53', '#D45A42']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>New Chat</Text>
        </View>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={15} color="rgba(255,255,255,0.75)" />
          <TextInput
            ref={searchRef}
            style={styles.searchInput}
            placeholder="Search contacts..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.7)" />
            </Pressable>
          )}
        </View>
      </LinearGradient>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => renderContact(item)}
        ListHeaderComponent={
          <View style={styles.actionsRow}>
            <Pressable
              style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.85 }]}
              onPress={() => router.push('/create-group')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#4D7E82' }]}>
                <Ionicons name="people" size={20} color="#fff" />
              </View>
              <Text style={styles.actionLabel}>New Group</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.85 }]}
              onPress={() => router.push('/add-contact')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#E46C53' }]}>
                <Ionicons name="person-add" size={20} color="#fff" />
              </View>
              <Text style={styles.actionLabel}>Add Contact</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.85 }]}
              onPress={handleSyncContacts}
              disabled={syncing}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#F1A167' }]}>
                {syncing
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="sync" size={20} color="#fff" />
                }
              </View>
              <Text style={styles.actionLabel}>Sync Contacts</Text>
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title={q ? 'No contacts found' : 'No contacts yet'}
            subtitle={q ? 'Try a different name or number' : 'Add a contact to start chatting'}
            action={!q ? { label: 'Add Contact', onPress: () => router.push('/add-contact') } : undefined}
          />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={appColors.primary} />
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={appColors.primary} />
            </View>
          ) : null
        }
        onEndReached={hasMore && !search ? loadMore : undefined}
        onEndReachedThreshold={0.3}
        contentContainerStyle={{ paddingBottom: 40 }}
        stickySectionHeadersEnabled
      />
    </View>
  );
}


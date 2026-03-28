import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '../theme';
import { contactApi, chatApi, ContactItem, tokenStorage } from '../services/api';

export default function NewChatScreen() {
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [filtered, setFiltered] = useState<ContactItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myUserId, setMyUserId] = useState('');

  const loadContacts = useCallback(async () => {
    try {
      const { contacts: data } = await contactApi.getContacts();
      setContacts(data);
      setFiltered(data);
    } catch {
      // Will retry on refresh
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const token = await tokenStorage.get();
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]!));
          setMyUserId(payload.sub);
        } catch {
          // Ignore
        }
      }
      await loadContacts();
      setLoading(false);
    };
    init();
  }, [loadContacts]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(contacts);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(
      contacts.filter((c) => {
        const name = c.nickname ?? c.contactUser.name ?? '';
        const phone = c.contactUser.phone;
        return name.toLowerCase().includes(q) || phone.includes(q);
      }),
    );
  }, [search, contacts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadContacts();
    setRefreshing(false);
  }, [loadContacts]);

  const handleSelectContact = useCallback(
    async (contact: ContactItem) => {
      try {
        const { chat } = await chatApi.createChat(contact.contactUserId);
        const otherUser = chat.participants.find((p) => p.userId !== myUserId)?.user;
        router.replace({
          pathname: '/chat',
          params: {
            chatId: chat.id,
            name: contact.nickname ?? otherUser?.name ?? otherUser?.phone ?? 'Chat',
            recipientId: contact.contactUserId,
          },
        });
      } catch {
        // Fallback — just go back
        router.back();
      }
    },
    [myUserId, router],
  );

  const renderContact = useCallback(
    ({ item }: { item: ContactItem }) => {
      const displayName = item.nickname ?? item.contactUser.name ?? item.contactUser.phone;
      const subtitle = item.nickname
        ? item.contactUser.name ?? item.contactUser.phone
        : item.contactUser.about ?? item.contactUser.phone;
      const isOnline = item.contactUser.isOnline;

      return (
        <Pressable
          style={({ pressed }) => [styles.contactItem, pressed && styles.contactItemPressed]}
          onPress={() => handleSelectContact(item)}
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {displayName[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
            {isOnline && <View style={styles.onlineDot} />}
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.contactSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        </Pressable>
      );
    },
    [handleSelectContact],
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
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>{'\u2190'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>New Chat</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Add Contact action */}
      <Pressable
        style={({ pressed }) => [styles.actionItem, pressed && styles.contactItemPressed]}
        onPress={() => router.push('/add-contact')}
      >
        <View style={[styles.avatar, styles.actionAvatar]}>
          <Text style={styles.actionIcon}>+</Text>
        </View>
        <Text style={styles.actionText}>Add New Contact</Text>
      </Pressable>

      {/* Contacts list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderContact}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {search ? 'No contacts match your search' : 'No contacts yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              Add contacts to start chatting
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
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 60,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  backArrow: {
    fontSize: 24,
    color: colors.primary,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  searchBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  searchInput: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionAvatar: {
    backgroundColor: colors.primary,
    marginRight: spacing.md,
  },
  actionIcon: {
    fontSize: 24,
    color: colors.white,
    fontWeight: typography.weights.bold,
    marginTop: -2,
  },
  actionText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    backgroundColor: colors.background,
  },
  contactItemPressed: {
    backgroundColor: colors.surface,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background,
  },
  contactInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  contactName: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  contactSubtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
  },
});

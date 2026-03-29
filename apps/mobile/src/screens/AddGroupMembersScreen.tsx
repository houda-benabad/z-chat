import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '../theme';
import { contactApi, groupApi, ContactItem, GroupInfo, tokenStorage } from '../services/api';

export default function AddGroupMembersScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [filtered, setFiltered] = useState<ContactItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [existingMemberIds, setExistingMemberIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const init = async () => {
      try {
        const [contactsRes, groupRes] = await Promise.all([
          contactApi.getContacts(),
          chatId ? groupApi.getGroupInfo(chatId) : null,
        ]);
        setContacts(contactsRes.contacts);
        setFiltered(contactsRes.contacts);
        if (groupRes) {
          setExistingMemberIds(new Set(groupRes.group.participants.map((p) => p.userId)));
        }
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [chatId]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(contacts);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(
      contacts.filter((c) => {
        const name = c.nickname ?? c.contactUser.name ?? '';
        return name.toLowerCase().includes(q) || c.contactUser.phone.includes(q);
      }),
    );
  }, [search, contacts]);

  const toggleMember = useCallback((contactUserId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(contactUserId)) next.delete(contactUserId);
      else next.add(contactUserId);
      return next;
    });
  }, []);

  const handleAdd = useCallback(async () => {
    if (!chatId || selectedIds.size === 0) return;
    setAdding(true);
    try {
      await groupApi.addMembers(chatId, [...selectedIds]);
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to add members');
    } finally {
      setAdding(false);
    }
  }, [chatId, selectedIds, router]);

  const renderContact = useCallback(
    ({ item }: { item: ContactItem }) => {
      const displayName = item.nickname ?? item.contactUser.name ?? item.contactUser.phone;
      const isExisting = existingMemberIds.has(item.contactUserId);
      const isSelected = selectedIds.has(item.contactUserId);

      return (
        <Pressable
          style={({ pressed }) => [
            styles.contactItem,
            pressed && !isExisting && styles.contactItemPressed,
            isExisting && styles.contactItemDisabled,
          ]}
          onPress={() => !isExisting && toggleMember(item.contactUserId)}
          disabled={isExisting}
        >
          <View style={[styles.avatar, isSelected && styles.avatarSelected, isExisting && styles.avatarDisabled]}>
            {isSelected ? (
              <Text style={styles.checkmark}>{'\u2713'}</Text>
            ) : (
              <Text style={styles.avatarText}>
                {displayName[0]?.toUpperCase() ?? '?'}
              </Text>
            )}
          </View>
          <View style={styles.contactInfo}>
            <Text style={[styles.contactName, isExisting && styles.contactNameDisabled]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.contactSubtitle}>
              {isExisting ? 'Already in group' : item.contactUser.phone}
            </Text>
          </View>
        </Pressable>
      );
    },
    [selectedIds, existingMemberIds, toggleMember],
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
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>{'\u2190'}</Text>
        </Pressable>
        <Text style={{ flex: 1, ...styles.headerTitleStyle }}>Add Members</Text>
        <Pressable
          style={[styles.addButton, (selectedIds.size === 0 || adding) && styles.addButtonDisabled]}
          onPress={handleAdd}
          disabled={selectedIds.size === 0 || adding}
        >
          {adding ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.addButtonText}>
              Add{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
            </Text>
          )}
        </Pressable>
      </View>

      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderContact}
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
  headerTitleStyle: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  addButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
  },
  addButtonDisabled: {
    backgroundColor: colors.border,
  },
  addButtonText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
  searchBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  contactItemPressed: {
    backgroundColor: colors.surface,
  },
  contactItemDisabled: {
    opacity: 0.5,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarSelected: {
    backgroundColor: colors.primary,
  },
  avatarDisabled: {
    backgroundColor: colors.border,
  },
  avatarText: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
  checkmark: {
    fontSize: 22,
    color: colors.white,
    fontWeight: typography.weights.bold,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  contactNameDisabled: {
    color: colors.textSecondary,
  },
  contactSubtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
  },
});

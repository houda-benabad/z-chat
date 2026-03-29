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
import { useRouter } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '../theme';
import { contactApi, groupApi, ContactItem, tokenStorage } from '../services/api';

type Step = 'select-members' | 'group-details';

export default function CreateGroupScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('select-members');
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [filtered, setFiltered] = useState<ContactItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');

  const loadContacts = useCallback(async () => {
    try {
      const { contacts: data } = await contactApi.getContacts();
      setContacts(data);
      setFiltered(data);
    } catch {
      // Will retry
    }
  }, []);

  useEffect(() => {
    const init = async () => {
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

  const toggleMember = useCallback((contactUserId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(contactUserId)) {
        next.delete(contactUserId);
      } else {
        next.add(contactUserId);
      }
      return next;
    });
  }, []);

  const handleNext = useCallback(() => {
    if (selectedIds.size === 0) {
      Alert.alert('Select Members', 'Please select at least one contact');
      return;
    }
    setStep('group-details');
  }, [selectedIds]);

  const handleCreate = useCallback(async () => {
    const name = groupName.trim();
    if (!name) {
      Alert.alert('Group Name', 'Please enter a group name');
      return;
    }

    setCreating(true);
    try {
      const { chat } = await groupApi.createGroup({
        name,
        description: groupDescription.trim() || undefined,
        memberIds: [...selectedIds],
      });

      router.replace({
        pathname: '/chat',
        params: {
          chatId: chat.id,
          name,
          chatType: 'group',
        },
      });
    } catch {
      Alert.alert('Error', 'Failed to create group. Please try again.');
    } finally {
      setCreating(false);
    }
  }, [groupName, groupDescription, selectedIds, router]);

  const renderContact = useCallback(
    ({ item }: { item: ContactItem }) => {
      const displayName = item.nickname ?? item.contactUser.name ?? item.contactUser.phone;
      const isSelected = selectedIds.has(item.contactUserId);

      return (
        <Pressable
          style={({ pressed }) => [styles.contactItem, pressed && styles.contactItemPressed]}
          onPress={() => toggleMember(item.contactUserId)}
        >
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, isSelected && styles.avatarSelected]}>
              {isSelected ? (
                <Text style={styles.checkmark}>{'\u2713'}</Text>
              ) : (
                <Text style={styles.avatarText}>
                  {displayName[0]?.toUpperCase() ?? '?'}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.contactSubtitle} numberOfLines={1}>
              {item.contactUser.about ?? item.contactUser.phone}
            </Text>
          </View>
        </Pressable>
      );
    },
    [selectedIds, toggleMember],
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (step === 'group-details') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => setStep('select-members')} style={styles.backButton}>
            <Text style={styles.backArrow}>{'\u2190'}</Text>
          </Pressable>
          <Text style={styles.headerTitle}>New Group</Text>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.groupAvatarLarge}>
            <Text style={styles.groupAvatarLargeText}>
              {groupName.trim() ? groupName[0]!.toUpperCase() : 'G'}
            </Text>
          </View>

          <TextInput
            style={styles.groupNameInput}
            placeholder="Group name"
            placeholderTextColor={colors.textSecondary}
            value={groupName}
            onChangeText={setGroupName}
            maxLength={100}
            autoFocus
          />

          <TextInput
            style={styles.groupDescInput}
            placeholder="Group description (optional)"
            placeholderTextColor={colors.textSecondary}
            value={groupDescription}
            onChangeText={setGroupDescription}
            maxLength={500}
            multiline
          />

          <Text style={styles.memberCount}>
            {selectedIds.size} member{selectedIds.size !== 1 ? 's' : ''} selected
          </Text>

          <View style={styles.selectedMembersRow}>
            {contacts
              .filter((c) => selectedIds.has(c.contactUserId))
              .slice(0, 6)
              .map((c) => {
                const name = c.nickname ?? c.contactUser.name ?? c.contactUser.phone;
                return (
                  <View key={c.contactUserId} style={styles.selectedChip}>
                    <Text style={styles.selectedChipText} numberOfLines={1}>
                      {name}
                    </Text>
                  </View>
                );
              })}
            {selectedIds.size > 6 && (
              <Text style={styles.moreText}>+{selectedIds.size - 6} more</Text>
            )}
          </View>

          <Pressable
            style={[styles.createButton, (!groupName.trim() || creating) && styles.createButtonDisabled]}
            onPress={handleCreate}
            disabled={!groupName.trim() || creating}
          >
            {creating ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.createButtonText}>Create Group</Text>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>{'\u2190'}</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Select Members</Text>
          {selectedIds.size > 0 && (
            <Text style={styles.headerSubtitle}>
              {selectedIds.size} selected
            </Text>
          )}
        </View>
        <Pressable
          style={[styles.nextButton, selectedIds.size === 0 && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={selectedIds.size === 0}
        >
          <Text style={[styles.nextButtonText, selectedIds.size === 0 && styles.nextButtonTextDisabled]}>
            Next
          </Text>
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
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {search ? 'No contacts match your search' : 'No contacts yet'}
            </Text>
          </View>
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
  headerSubtitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
    marginTop: 2,
  },
  nextButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
  },
  nextButtonDisabled: {
    backgroundColor: colors.border,
  },
  nextButtonText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
  nextButtonTextDisabled: {
    color: colors.textSecondary,
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
  avatarSelected: {
    backgroundColor: colors.primary,
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
  },
  detailsContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  groupAvatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  groupAvatarLargeText: {
    fontSize: 32,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  groupNameInput: {
    width: '100%',
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    textAlign: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    marginBottom: spacing.md,
  },
  groupDescInput: {
    width: '100%',
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    color: colors.text,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.lg,
    maxHeight: 80,
  },
  memberCount: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  selectedMembersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  selectedChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 120,
  },
  selectedChipText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    color: colors.text,
  },
  moreText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
    alignSelf: 'center',
  },
  createButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: colors.border,
  },
  createButtonText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
});

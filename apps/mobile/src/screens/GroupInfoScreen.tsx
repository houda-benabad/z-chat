import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '../theme';
import { groupApi, GroupInfo, tokenStorage } from '../services/api';

export default function GroupInfoScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const router = useRouter();
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [myUserId, setMyUserId] = useState('');

  const loadGroup = useCallback(async () => {
    if (!chatId) return;
    try {
      const { group: data } = await groupApi.getGroupInfo(chatId);
      setGroup(data);
    } catch {
      Alert.alert('Error', 'Failed to load group info');
    } finally {
      setLoading(false);
    }
  }, [chatId]);

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
      await loadGroup();
    };
    init();
  }, [loadGroup]);

  const isAdmin = group?.participants.some(
    (p) => p.userId === myUserId && p.role === 'admin',
  );

  const handleRemoveMember = useCallback(
    async (userId: string, userName: string) => {
      if (!chatId) return;
      Alert.alert(
        'Remove Member',
        `Remove ${userName} from the group?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                await groupApi.removeMember(chatId, userId);
                loadGroup();
              } catch {
                Alert.alert('Error', 'Failed to remove member');
              }
            },
          },
        ],
      );
    },
    [chatId, loadGroup],
  );

  const handleToggleAdmin = useCallback(
    async (userId: string, currentRole: string) => {
      if (!chatId) return;
      const newRole = currentRole === 'admin' ? 'member' : 'admin';
      try {
        await groupApi.updateMemberRole(chatId, userId, newRole);
        loadGroup();
      } catch {
        Alert.alert('Error', 'Failed to update role');
      }
    },
    [chatId, loadGroup],
  );

  const handleLeaveGroup = useCallback(() => {
    if (!chatId) return;
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await groupApi.removeMember(chatId, myUserId);
              router.replace('/chat-list');
            } catch {
              Alert.alert('Error', 'Failed to leave group');
            }
          },
        },
      ],
    );
  }, [chatId, myUserId, router]);

  const handleAddMembers = useCallback(() => {
    router.push({
      pathname: '/add-group-members',
      params: { chatId },
    });
  }, [chatId, router]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Group not found</Text>
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
        <Text style={styles.headerTitle}>Group Info</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Group avatar & name */}
        <View style={styles.profileSection}>
          <View style={styles.groupAvatarLarge}>
            <Text style={styles.groupAvatarLargeText}>
              {group.name[0]?.toUpperCase() ?? 'G'}
            </Text>
          </View>
          <Text style={styles.groupName}>{group.name}</Text>
          {group.description && (
            <Text style={styles.groupDescription}>{group.description}</Text>
          )}
          <Text style={styles.memberCountText}>
            {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          {isAdmin && (
            <Pressable
              style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}
              onPress={handleAddMembers}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.primary }]}>
                <Text style={styles.actionIconText}>+</Text>
              </View>
              <Text style={styles.actionText}>Add Members</Text>
            </Pressable>
          )}
        </View>

        {/* Members list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Members</Text>
          {group.participants.map((p) => {
            const user = p.user;
            const displayName = user.name ?? user.phone;
            const isMe = p.userId === myUserId;
            const isCreator = p.userId === group.createdBy;

            return (
              <View key={p.id} style={styles.memberRow}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>
                    {displayName[0]?.toUpperCase() ?? '?'}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName} numberOfLines={1}>
                    {displayName}{isMe ? ' (You)' : ''}
                  </Text>
                  <Text style={styles.memberPhone}>{user.phone}</Text>
                </View>
                <View style={styles.memberActions}>
                  {p.role === 'admin' && (
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminBadgeText}>Admin</Text>
                    </View>
                  )}
                  {isAdmin && !isMe && (
                    <View style={styles.memberButtons}>
                      {!isCreator && (
                        <Pressable
                          style={styles.memberActionButton}
                          onPress={() => handleToggleAdmin(p.userId, p.role)}
                        >
                          <Text style={styles.memberActionButtonText}>
                            {p.role === 'admin' ? 'Demote' : 'Make Admin'}
                          </Text>
                        </Pressable>
                      )}
                      {!isCreator && (
                        <Pressable
                          style={[styles.memberActionButton, styles.memberRemoveButton]}
                          onPress={() => handleRemoveMember(p.userId, displayName)}
                        >
                          <Text style={styles.memberRemoveText}>Remove</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Leave group */}
        <Pressable
          style={({ pressed }) => [styles.leaveButton, pressed && styles.leaveButtonPressed]}
          onPress={handleLeaveGroup}
        >
          <Text style={styles.leaveButtonText}>Leave Group</Text>
        </Pressable>
      </ScrollView>
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
  errorText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
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
  scrollContent: {
    paddingBottom: 40,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    borderBottomWidth: 8,
    borderBottomColor: colors.surface,
  },
  groupAvatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  groupAvatarLargeText: {
    fontSize: 32,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  groupName: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  groupDescription: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  memberCountText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
  },
  section: {
    borderBottomWidth: 8,
    borderBottomColor: colors.surface,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  actionRowPressed: {
    backgroundColor: colors.surface,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  actionIconText: {
    fontSize: 22,
    color: colors.white,
    fontWeight: typography.weights.bold,
  },
  actionText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  memberAvatarText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  memberPhone: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
    marginTop: 1,
  },
  memberActions: {
    alignItems: 'flex-end',
  },
  adminBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.secondary,
    marginBottom: 4,
  },
  adminBadgeText: {
    fontSize: 10,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
  memberButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  memberActionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberActionButtonText: {
    fontSize: 11,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
  },
  memberRemoveButton: {
    borderColor: colors.crimson,
  },
  memberRemoveText: {
    fontSize: 11,
    fontFamily: typography.fontFamily,
    color: colors.crimson,
  },
  leaveButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    paddingVertical: 16,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.crimson,
    alignItems: 'center',
  },
  leaveButtonPressed: {
    backgroundColor: 'rgba(237, 47, 60, 0.05)',
  },
  leaveButtonText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.crimson,
  },
});

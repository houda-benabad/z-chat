import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '../theme';
import { settingsApi, BlockedUserItem } from '../services/api';

export default function SettingsBlockedScreen() {
  const router = useRouter();
  const [blocked, setBlocked] = useState<BlockedUserItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBlocked = useCallback(async () => {
    try {
      const { blocked: data } = await settingsApi.getBlocked();
      setBlocked(data);
    } catch {
      // Handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBlocked();
  }, [loadBlocked]);

  const handleUnblock = useCallback((item: BlockedUserItem) => {
    const name = item.blockedUser.name ?? item.blockedUser.phone;
    Alert.alert(
      'Unblock Contact',
      `Unblock ${name}? They will be able to message and call you again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            try {
              await settingsApi.unblockUser(item.blockedUserId);
              setBlocked((prev) => prev.filter((b) => b.id !== item.id));
            } catch {
              Alert.alert('Error', 'Failed to unblock user');
            }
          },
        },
      ],
    );
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: BlockedUserItem }) => {
      const displayName = item.blockedUser.name ?? item.blockedUser.phone;
      return (
        <View style={styles.contactRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {displayName[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactName}>{displayName}</Text>
            <Text style={styles.contactPhone}>{item.blockedUser.phone}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.unblockButton, pressed && styles.unblockButtonPressed]}
            onPress={() => handleUnblock(item)}
          >
            <Text style={styles.unblockText}>Unblock</Text>
          </Pressable>
        </View>
      );
    },
    [handleUnblock],
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
        <Text style={styles.headerTitle}>Blocked Contacts</Text>
      </View>

      <FlatList
        data={blocked}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={blocked.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No blocked contacts</Text>
            <Text style={styles.emptySubtitle}>
              Blocked contacts cannot send you messages or call you
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
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
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
  avatarText: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  contactPhone: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
    marginTop: 1,
  },
  unblockButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  unblockButtonPressed: {
    backgroundColor: 'rgba(228, 108, 83, 0.1)',
  },
  unblockText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
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
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});

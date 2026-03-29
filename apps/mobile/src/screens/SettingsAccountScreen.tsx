import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '../theme';
import { settingsApi, tokenStorage } from '../services/api';

export default function SettingsAccountScreen() {
  const router = useRouter();

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account, messages, and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'Type confirmation to proceed. All your data will be permanently deleted.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await settingsApi.deleteAccount();
                      await tokenStorage.remove();
                      router.replace('/');
                    } catch {
                      Alert.alert('Error', 'Failed to delete account');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>{'\u2190'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Account</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Privacy */}
        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={() => router.push('/settings-privacy')}
          >
            <Text style={styles.rowIcon}>{'\u{1F512}'}</Text>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Privacy</Text>
              <Text style={styles.rowSubtitle}>Last seen, read receipts, blocked contacts</Text>
            </View>
            <Text style={styles.chevron}>{'\u203A'}</Text>
          </Pressable>
        </View>

        {/* Security info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>{'\u{1F6E1}'}</Text>
            <Text style={styles.infoTitle}>End-to-End Encryption</Text>
            <Text style={styles.infoText}>
              Messages and calls are secured with end-to-end encryption using the Signal Protocol.
              Only you and the person you're communicating with can read or listen to them.
              Not even z.chat can access your messages.
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>{'\u{1F510}'}</Text>
            <Text style={styles.infoTitle}>Two-Step Verification</Text>
            <Text style={styles.infoText}>
              Your account is protected with phone-based OTP authentication.
              Each login session requires a fresh verification code sent to your phone number.
            </Text>
          </View>
        </View>

        {/* Danger zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.crimson }]}>Danger Zone</Text>
          <Pressable
            style={({ pressed }) => [styles.dangerRow, pressed && styles.dangerRowPressed]}
            onPress={handleDeleteAccount}
          >
            <Text style={styles.dangerText}>Delete My Account</Text>
            <Text style={styles.dangerSubtext}>
              Permanently delete your account and all associated data
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  scrollContent: {
    paddingBottom: 40,
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
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  pressed: {
    backgroundColor: colors.surface,
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
  chevron: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  infoCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
  },
  infoIcon: {
    fontSize: 24,
    marginBottom: spacing.sm,
  },
  infoTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  dangerRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  dangerRowPressed: {
    backgroundColor: 'rgba(237, 47, 60, 0.05)',
  },
  dangerText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.crimson,
  },
  dangerSubtext: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

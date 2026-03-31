import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '../theme';
import { userApi, UserProfile, tokenStorage } from '../services/api';

interface SettingsRow {
  label: string;
  subtitle?: string;
  icon: string;
  route: string;
  color?: string;
}

const SETTINGS_SECTIONS: { title: string; rows: SettingsRow[] }[] = [
  {
    title: '',
    rows: [
      { label: 'Account', subtitle: 'Privacy, security, change number', icon: '\u{1F511}', route: '/settings-account' },
    ],
  },
  {
    title: 'Preferences',
    rows: [
      { label: 'Privacy', subtitle: 'Last seen, read receipts, blocked', icon: '\u{1F512}', route: '/settings-privacy' },
      { label: 'Notifications', subtitle: 'Message, group, call alerts', icon: '\u{1F514}', route: '/settings-notifications' },
      { label: 'Storage & Data', subtitle: 'Auto-download, data usage', icon: '\u{1F4BE}', route: '/settings-storage' },
      { label: 'Appearance', subtitle: 'Theme, accent color, font size', icon: '\u{1F3A8}', route: '/settings-appearance' },
    ],
  },
  {
    title: 'Support',
    rows: [
      { label: 'Help', subtitle: 'FAQ, contact us, terms & privacy', icon: '\u{2753}', route: '/settings-help' },
    ],
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    await tokenStorage.remove();
    router.replace('/');
  };

  useEffect(() => {
    const load = async () => {
      try {
        const { user } = await userApi.getMe();
        setProfile(user);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile card */}
        <Pressable
          style={({ pressed }) => [styles.profileCard, pressed && styles.pressed]}
          onPress={() => router.push('/settings-profile')}
        >
          <View style={styles.profileAvatar}>
            {profile?.avatar ? (
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
            {error && (
              <Text style={styles.profileError}>{error}</Text>
            )}
          </View>
          <Text style={styles.chevron}>{'\u203A'}</Text>
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
                <Text style={[styles.rowIcon, row.color ? { color: row.color } : null]}>
                  {row.icon}
                </Text>
                <View style={styles.rowContent}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  {row.subtitle && (
                    <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
                  )}
                </View>
                <Text style={styles.chevron}>{'\u203A'}</Text>
              </Pressable>
            ))}
          </View>
        ))}

        {/* Logout */}
        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [styles.logoutRow, pressed && styles.pressed]}
            onPress={handleLogout}
          >
            <Text style={styles.logoutIcon}>{'↩'}</Text>
            <Text style={styles.logoutLabel}>Log Out</Text>
          </Pressable>
        </View>

        {/* App info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>z.chat by z.systems</Text>
          <Text style={styles.appInfoVersion}>Version 1.0.0</Text>
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
  scrollContent: {
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 8,
    borderBottomColor: colors.surface,
  },
  pressed: {
    backgroundColor: colors.surface,
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
  profileError: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    color: '#ED2F3C',
    marginTop: 4,
  },
  chevron: {
    fontSize: 24,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
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
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 16,
  },
  logoutIcon: {
    fontSize: 20,
    width: 36,
    textAlign: 'center',
    marginRight: spacing.md,
    color: '#ED2F3C',
  },
  logoutLabel: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.medium,
    color: '#ED2F3C',
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
});

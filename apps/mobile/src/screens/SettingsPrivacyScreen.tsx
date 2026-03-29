import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '../theme';
import { settingsApi, UserSettings } from '../services/api';

type Visibility = 'everyone' | 'contacts' | 'nobody';

const DISAPPEAR_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '24 hours', value: 86400 },
  { label: '7 days', value: 604800 },
  { label: '90 days', value: 7776000 },
];

function VisibilitySelector({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Visibility;
  onChange: (v: Visibility) => void;
}) {
  const options: Visibility[] = ['everyone', 'contacts', 'nobody'];
  return (
    <View style={styles.visibilitySection}>
      <Text style={styles.visibilityLabel}>{label}</Text>
      <View style={styles.visibilityOptions}>
        {options.map((opt) => (
          <Pressable
            key={opt}
            style={[styles.visibilityOption, value === opt && styles.visibilityOptionActive]}
            onPress={() => onChange(opt)}
          >
            <Text
              style={[styles.visibilityOptionText, value === opt && styles.visibilityOptionTextActive]}
            >
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function SettingsPrivacyScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { settings: data } = await settingsApi.getSettings();
        setSettings(data);
      } catch {
        // Handle
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const updatePrivacy = useCallback(async (update: Partial<UserSettings>) => {
    if (!settings) return;
    const optimistic = { ...settings, ...update };
    setSettings(optimistic);
    try {
      const { settings: updated } = await settingsApi.updatePrivacy(update);
      setSettings(updated);
    } catch {
      setSettings(settings); // revert
    }
  }, [settings]);

  if (loading || !settings) {
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
        <Text style={styles.headerTitle}>Privacy</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Visibility settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Who can see my...</Text>
          <VisibilitySelector
            label="Last Seen"
            value={settings.lastSeenVisibility}
            onChange={(v) => updatePrivacy({ lastSeenVisibility: v })}
          />
          <VisibilitySelector
            label="Profile Photo"
            value={settings.profilePhotoVisibility}
            onChange={(v) => updatePrivacy({ profilePhotoVisibility: v })}
          />
          <VisibilitySelector
            label="About"
            value={settings.aboutVisibility}
            onChange={(v) => updatePrivacy({ aboutVisibility: v })}
          />
        </View>

        {/* Read receipts */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Read Receipts</Text>
              <Text style={styles.toggleSubtitle}>
                If turned off, you won't send or receive read receipts
              </Text>
            </View>
            <Switch
              value={settings.readReceipts}
              onValueChange={(v) => updatePrivacy({ readReceipts: v })}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {/* Disappearing messages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Disappearing Messages</Text>
          <Text style={styles.sectionSubtitle}>
            Set a default timer for new chats
          </Text>
          <View style={styles.disappearOptions}>
            {DISAPPEAR_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[
                  styles.disappearOption,
                  settings.defaultDisappearTimer === opt.value && styles.disappearOptionActive,
                ]}
                onPress={() => updatePrivacy({ defaultDisappearTimer: opt.value })}
              >
                <Text
                  style={[
                    styles.disappearOptionText,
                    settings.defaultDisappearTimer === opt.value && styles.disappearOptionTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Blocked contacts */}
        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
            onPress={() => router.push('/settings-blocked')}
          >
            <Text style={styles.navRowLabel}>Blocked Contacts</Text>
            <Text style={styles.chevron}>{'\u203A'}</Text>
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
  section: {
    paddingVertical: spacing.md,
    borderBottomWidth: 8,
    borderBottomColor: colors.surface,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionSubtitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  visibilitySection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  visibilityLabel: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  visibilityOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  visibilityOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  visibilityOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  visibilityOptionText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  visibilityOptionTextActive: {
    color: colors.white,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  toggleInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  toggleLabel: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  toggleSubtitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
    marginTop: 2,
  },
  disappearOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  disappearOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disappearOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  disappearOptionText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
  },
  disappearOptionTextActive: {
    color: colors.white,
    fontWeight: typography.weights.semibold,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  pressed: {
    backgroundColor: colors.surface,
  },
  navRowLabel: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  chevron: {
    fontSize: 24,
    color: colors.textSecondary,
  },
});

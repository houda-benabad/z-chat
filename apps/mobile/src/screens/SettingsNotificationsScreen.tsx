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
import { colors, spacing, typography } from '../theme';
import { settingsApi, UserSettings } from '../services/api';

interface ToggleRowProps {
  label: string;
  subtitle?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}

function ToggleRow({ label, subtitle, value, onToggle }: ToggleRowProps) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleInfo}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {subtitle && <Text style={styles.toggleSubtitle}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.white}
      />
    </View>
  );
}

export default function SettingsNotificationsScreen() {
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

  const update = useCallback(async (field: keyof UserSettings, value: boolean) => {
    if (!settings) return;
    const prev = settings;
    setSettings({ ...settings, [field]: value });
    try {
      const { settings: updated } = await settingsApi.updateNotifications({ [field]: value });
      setSettings(updated);
    } catch {
      setSettings(prev);
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
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alerts</Text>
          <ToggleRow
            label="Message Notifications"
            subtitle="Show notifications for new messages"
            value={settings.messageNotifications}
            onToggle={(v) => update('messageNotifications', v)}
          />
          <ToggleRow
            label="Group Notifications"
            subtitle="Show notifications for group messages"
            value={settings.groupNotifications}
            onToggle={(v) => update('groupNotifications', v)}
          />
          <ToggleRow
            label="Call Notifications"
            subtitle="Show notifications for incoming calls"
            value={settings.callNotifications}
            onToggle={(v) => update('callNotifications', v)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <ToggleRow
            label="Sound"
            subtitle="Play sound for notifications"
            value={settings.notificationSound}
            onToggle={(v) => update('notificationSound', v)}
          />
          <ToggleRow
            label="Vibrate"
            subtitle="Vibrate on notification"
            value={settings.notificationVibrate}
            onToggle={(v) => update('notificationVibrate', v)}
          />
          <ToggleRow
            label="Message Preview"
            subtitle="Show message content in notifications"
            value={settings.notificationPreview}
            onToggle={(v) => update('notificationPreview', v)}
          />
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
    borderBottomWidth: 8,
    borderBottomColor: colors.surface,
    paddingVertical: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
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
    marginTop: 1,
  },
});

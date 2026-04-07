import {
  View,
  Text,
  Pressable,
  Switch,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import { useNotificationSettings } from '../hooks/useNotificationSettings';
import type { UserSettings } from '@/types';
import { createStyles } from './styles/SettingsNotificationsScreen.styles';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';

interface ToggleRowProps {
  label: string;
  subtitle?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  styles: ReturnType<typeof createStyles>;
}

function ToggleRow({ label, subtitle, value, onToggle, styles }: ToggleRowProps) {
  const { appColors } = useAppSettings();
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleInfo}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {subtitle && <Text style={styles.toggleSubtitle}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: appColors.border, true: appColors.primary }}
        thumbColor={appColors.white}
      />
    </View>
  );
}

export default function SettingsNotificationsScreen() {
  const styles = useThemedStyles(createStyles);
  const { appColors } = useAppSettings();
  const router = useRouter();
  const { settings, loading, update } = useNotificationSettings();

  if (loading || !settings) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={appColors.primary} />
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
            onToggle={(v) => update('messageNotifications' as keyof UserSettings, v)}
            styles={styles}
          />
          <ToggleRow
            label="Group Notifications"
            subtitle="Show notifications for group messages"
            value={settings.groupNotifications}
            onToggle={(v) => update('groupNotifications' as keyof UserSettings, v)}
            styles={styles}
          />
          <ToggleRow
            label="Call Notifications"
            subtitle="Show notifications for incoming calls"
            value={settings.callNotifications}
            onToggle={(v) => update('callNotifications' as keyof UserSettings, v)}
            styles={styles}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <ToggleRow
            label="Sound"
            subtitle="Play sound for notifications"
            value={settings.notificationSound}
            onToggle={(v) => update('notificationSound' as keyof UserSettings, v)}
            styles={styles}
          />
          <ToggleRow
            label="Vibrate"
            subtitle="Vibrate on notification"
            value={settings.notificationVibrate}
            onToggle={(v) => update('notificationVibrate' as keyof UserSettings, v)}
            styles={styles}
          />
          <ToggleRow
            label="Message Preview"
            subtitle="Show message content in notifications"
            value={settings.notificationPreview}
            onToggle={(v) => update('notificationPreview' as keyof UserSettings, v)}
            styles={styles}
          />
        </View>
      </ScrollView>
    </View>
  );
}

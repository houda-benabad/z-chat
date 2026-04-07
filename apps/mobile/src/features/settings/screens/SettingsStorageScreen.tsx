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
import { useStorageSettings } from '../hooks/useStorageSettings';
import type { UserSettings } from '@/types';
import { createStyles } from './styles/SettingsStorageScreen.styles';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';

export default function SettingsStorageScreen() {
  const styles = useThemedStyles(createStyles);
  const { appColors } = useAppSettings();
  const router = useRouter();
  const { settings, loading, update } = useStorageSettings();

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
        <Text style={styles.headerTitle}>Storage & Data</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Auto-Download Media</Text>
          <Text style={styles.sectionSubtitle}>
            Choose which media types to automatically download
          </Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Photos</Text>
              <Text style={styles.toggleSubtitle}>Automatically download photos</Text>
            </View>
            <Switch
              value={settings.autoDownloadPhotos}
              onValueChange={(v) => update('autoDownloadPhotos' as keyof UserSettings, v)}
              trackColor={{ false: appColors.border, true: appColors.primary }}
              thumbColor={appColors.white}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Videos</Text>
              <Text style={styles.toggleSubtitle}>Automatically download videos</Text>
            </View>
            <Switch
              value={settings.autoDownloadVideos}
              onValueChange={(v) => update('autoDownloadVideos' as keyof UserSettings, v)}
              trackColor={{ false: appColors.border, true: appColors.primary }}
              thumbColor={appColors.white}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Documents</Text>
              <Text style={styles.toggleSubtitle}>Automatically download documents</Text>
            </View>
            <Switch
              value={settings.autoDownloadDocuments}
              onValueChange={(v) => update('autoDownloadDocuments' as keyof UserSettings, v)}
              trackColor={{ false: appColors.border, true: appColors.primary }}
              thumbColor={appColors.white}
            />
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            When auto-download is off, you can still download media by tapping on it in the chat.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

import {
  View,
  Text,
  Pressable,
  Switch,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import { usePrivacySettings, DISAPPEAR_OPTIONS } from '../hooks/usePrivacySettings';
import { createStyles } from './styles/SettingsPrivacyScreen.styles';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';

type Visibility = 'everyone' | 'contacts' | 'nobody';

function VisibilitySelector({
  label,
  value,
  onChange,
  styles,
}: {
  label: string;
  value: Visibility;
  onChange: (v: Visibility) => void;
  styles: ReturnType<typeof createStyles>;
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
  const styles = useThemedStyles(createStyles);
  const { appColors } = useAppSettings();
  const router = useRouter();
  const {
    settings,
    loading,
    updateLastSeenVisibility,
    updateProfilePhotoVisibility,
    updateAboutVisibility,
    updateReadReceipts,
    updateDisappearTimer,
  } = usePrivacySettings();

  if (loading || !settings) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={appColors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
            onChange={updateLastSeenVisibility}
            styles={styles}
          />
          <VisibilitySelector
            label="Profile Photo"
            value={settings.profilePhotoVisibility}
            onChange={updateProfilePhotoVisibility}
            styles={styles}
          />
          <VisibilitySelector
            label="About"
            value={settings.aboutVisibility}
            onChange={updateAboutVisibility}
            styles={styles}
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
              onValueChange={updateReadReceipts}
              trackColor={{ false: appColors.border, true: appColors.primary }}
              thumbColor={appColors.white}
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
                onPress={() => updateDisappearTimer(opt.value)}
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
    </SafeAreaView>
  );
}

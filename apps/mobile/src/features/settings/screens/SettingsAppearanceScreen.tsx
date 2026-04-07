import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import { useAppearanceSettings } from '../hooks/useAppearanceSettings';
import { createStyles } from './styles/SettingsAppearanceScreen.styles';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';

const THEME_OPTIONS: { label: string; value: 'light' | 'dark'; icon: string }[] = [
  { label: 'Light', value: 'light', icon: '\u2600' },
  { label: 'Dark', value: 'dark', icon: '\u{1F319}' },
];

const FONT_SIZE_OPTIONS: { label: string; value: 'small' | 'medium' | 'large'; sample: number }[] = [
  { label: 'Small', value: 'small', sample: 13 },
  { label: 'Medium', value: 'medium', sample: 16 },
  { label: 'Large', value: 'large', sample: 19 },
];

export default function SettingsAppearanceScreen() {
  const router = useRouter();
  const { settings, loading, updateAppearance } = useAppearanceSettings();
  const styles = useThemedStyles(createStyles);
  const { appColors } = useAppSettings();

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
        <Text style={styles.headerTitle}>Appearance</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Theme */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theme</Text>
          <View style={styles.themeOptions}>
            {THEME_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[
                  styles.themeOption,
                  settings.theme === opt.value && styles.themeOptionActive,
                ]}
                onPress={() => updateAppearance({ theme: opt.value })}
              >
                <Text style={styles.themeIcon}>{opt.icon}</Text>
                <Text
                  style={[
                    styles.themeLabel,
                    settings.theme === opt.value && styles.themeLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Font Size */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Font Size</Text>
          <View style={styles.fontSizeOptions}>
            {FONT_SIZE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[
                  styles.fontSizeOption,
                  settings.fontSize === opt.value && styles.fontSizeOptionActive,
                ]}
                onPress={() => updateAppearance({ fontSize: opt.value })}
              >
                <Text
                  style={[
                    styles.fontSizeSample,
                    { fontSize: opt.sample },
                    settings.fontSize === opt.value && styles.fontSizeSampleActive,
                  ]}
                >
                  Aa
                </Text>
                <Text
                  style={[
                    styles.fontSizeLabel,
                    settings.fontSize === opt.value && styles.fontSizeLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Preview */}
          <View style={styles.preview}>
            <Text style={styles.previewTitle}>Preview</Text>
            <View style={styles.previewBubble}>
              <Text
                style={[
                  styles.previewMessage,
                  {
                    fontSize: FONT_SIZE_OPTIONS.find((o) => o.value === settings.fontSize)?.sample ?? 16,
                    color: appColors.white,
                  },
                ]}
              >
                Hey! How's it going?
              </Text>
            </View>
            <View style={[styles.previewBubble, styles.previewBubbleTheirs]}>
              <Text
                style={[
                  styles.previewMessage,
                  {
                    fontSize: FONT_SIZE_OPTIONS.find((o) => o.value === settings.fontSize)?.sample ?? 16,
                    color: appColors.text,
                  },
                ]}
              >
                Great! Just finished the project.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

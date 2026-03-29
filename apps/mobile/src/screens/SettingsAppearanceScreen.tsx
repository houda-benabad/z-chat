import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '../theme';
import { settingsApi, UserSettings } from '../services/api';

const THEME_OPTIONS: { label: string; value: 'light' | 'dark' | 'system'; icon: string }[] = [
  { label: 'Light', value: 'light', icon: '\u2600' },
  { label: 'Dark', value: 'dark', icon: '\u{1F319}' },
  { label: 'System', value: 'system', icon: '\u{1F4F1}' },
];

const FONT_SIZE_OPTIONS: { label: string; value: 'small' | 'medium' | 'large'; sample: number }[] = [
  { label: 'Small', value: 'small', sample: 13 },
  { label: 'Medium', value: 'medium', sample: 16 },
  { label: 'Large', value: 'large', sample: 19 },
];

const ACCENT_COLORS = [
  { label: 'Coral', value: '#E46C53' },
  { label: 'Teal', value: '#4D7E82' },
  { label: 'Crimson', value: '#ED2F3C' },
  { label: 'Peach', value: '#F1A167' },
  { label: 'Gold', value: '#F3D292' },
  { label: 'Ocean', value: '#3B82F6' },
  { label: 'Purple', value: '#8B5CF6' },
  { label: 'Emerald', value: '#10B981' },
];

export default function SettingsAppearanceScreen() {
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

  const updateAppearance = useCallback(async (update: Partial<Pick<UserSettings, 'theme' | 'accentColor' | 'fontSize'>>) => {
    if (!settings) return;
    const prev = settings;
    setSettings({ ...settings, ...update });
    try {
      const { settings: updated } = await settingsApi.updateAppearance(update);
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

        {/* Accent Color */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accent Color</Text>
          <View style={styles.colorGrid}>
            {ACCENT_COLORS.map((c) => (
              <Pressable
                key={c.value}
                style={styles.colorItem}
                onPress={() => updateAppearance({ accentColor: c.value })}
              >
                <View
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c.value },
                    settings.accentColor === c.value && styles.colorSwatchActive,
                  ]}
                >
                  {settings.accentColor === c.value && (
                    <Text style={styles.colorCheck}>{'\u2713'}</Text>
                  )}
                </View>
                <Text style={styles.colorLabel}>{c.label}</Text>
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
                    color: colors.white,
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
                    color: colors.text,
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
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  themeOptions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  themeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(228, 108, 83, 0.08)',
  },
  themeIcon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  themeLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  themeLabelActive: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  colorItem: {
    alignItems: 'center',
    width: 64,
  },
  colorSwatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  colorSwatchActive: {
    borderWidth: 3,
    borderColor: colors.text,
  },
  colorCheck: {
    fontSize: 20,
    color: colors.white,
    fontWeight: typography.weights.bold,
  },
  colorLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
  },
  fontSizeOptions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  fontSizeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  fontSizeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(228, 108, 83, 0.08)',
  },
  fontSizeSample: {
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  fontSizeSampleActive: {
    color: colors.primary,
  },
  fontSizeLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
  },
  fontSizeLabelActive: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  preview: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  previewTitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  previewBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.lg,
    borderBottomRightRadius: 4,
    marginBottom: spacing.sm,
    maxWidth: '80%',
  },
  previewBubbleTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderBottomRightRadius: borderRadius.lg,
    borderBottomLeftRadius: 4,
  },
  previewMessage: {
    fontFamily: typography.fontFamily,
    lineHeight: 24,
  },
});

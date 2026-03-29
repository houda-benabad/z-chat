import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '../theme';

const FAQ_ITEMS = [
  {
    question: 'How does end-to-end encryption work?',
    answer:
      'z.chat uses the Signal Protocol for end-to-end encryption. Messages are encrypted on your device before being sent and can only be decrypted by the recipient. Not even z.chat servers can read your messages.',
  },
  {
    question: 'Can I use z.chat on multiple devices?',
    answer:
      'Currently z.chat supports one device per account. Multi-device support is planned for a future update.',
  },
  {
    question: 'How do I delete my account?',
    answer:
      'Go to Settings > Account > Delete My Account. This action is permanent and will delete all your data including messages, groups, and contacts.',
  },
  {
    question: 'Are group messages also encrypted?',
    answer:
      'Yes. Group messages use the same Signal Protocol encryption. Each message is individually encrypted for every group member.',
  },
  {
    question: 'What data does z.chat collect?',
    answer:
      'z.chat only stores your phone number and profile information you provide. Message content is end-to-end encrypted and never stored in readable form on our servers.',
  },
];

export default function SettingsHelpScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>{'\u2190'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Help</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* FAQ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {FAQ_ITEMS.map((item, i) => (
            <View key={i} style={styles.faqItem}>
              <Text style={styles.faqQuestion}>{item.question}</Text>
              <Text style={styles.faqAnswer}>{item.answer}</Text>
            </View>
          ))}
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Pressable
            style={({ pressed }) => [styles.contactRow, pressed && styles.pressed]}
            onPress={() => Linking.openURL('mailto:support@z.systems')}
          >
            <Text style={styles.contactIcon}>{'\u{2709}'}</Text>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Email Support</Text>
              <Text style={styles.contactValue}>support@z.systems</Text>
            </View>
          </Pressable>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <Pressable
            style={({ pressed }) => [styles.legalRow, pressed && styles.pressed]}
          >
            <Text style={styles.legalText}>Terms of Service</Text>
            <Text style={styles.chevron}>{'\u203A'}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.legalRow, pressed && styles.pressed]}
          >
            <Text style={styles.legalText}>Privacy Policy</Text>
            <Text style={styles.chevron}>{'\u203A'}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.legalRow, pressed && styles.pressed]}
          >
            <Text style={styles.legalText}>Open Source Licenses</Text>
            <Text style={styles.chevron}>{'\u203A'}</Text>
          </Pressable>
        </View>

        {/* About */}
        <View style={styles.aboutSection}>
          <Text style={styles.aboutTitle}>z.chat</Text>
          <Text style={styles.aboutCompany}>by z.systems</Text>
          <Text style={styles.aboutMission}>Redefining the game, one trade at a time</Text>
          <Text style={styles.aboutVersion}>Version 1.0.0</Text>
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
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  faqItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  faqQuestion: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  faqAnswer: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  pressed: {
    backgroundColor: colors.surface,
  },
  contactIcon: {
    fontSize: 24,
    width: 36,
    textAlign: 'center',
    marginRight: spacing.md,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  contactValue: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    color: colors.primary,
    marginTop: 1,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  legalText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  chevron: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  aboutSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  aboutTitle: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  aboutCompany: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  aboutMission: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    fontStyle: 'italic',
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  aboutVersion: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    color: colors.border,
    marginTop: spacing.md,
  },
});

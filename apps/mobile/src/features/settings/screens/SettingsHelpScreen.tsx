import {
  View,
  Text,
  Pressable,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { createStyles } from './styles/SettingsHelpScreen.styles';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';

const FAQ_ITEMS = [
  {
    question: 'How does end-to-end encryption work?',
    answer:
      'z.chat uses the Signal Protocol for end-to-end encryption. Messages are encrypted on your device before being sent and can only be decrypted by the recipient. Not even z.chat servers can read your messages.',
  },
  {
    question: 'What do the message check marks mean?',
    answer:
      'One grey check = message sent to server. Two grey checks = delivered to recipient\'s device. Two coloured checks = message has been read.',
  },
  {
    question: 'How do I change my profile photo?',
    answer:
      'Go to Settings → Edit Profile and tap your profile picture. You can choose a new photo from your library. Photos are automatically resized before upload.',
  },
  {
    question: 'How do I mute or delete a conversation?',
    answer:
      'On the chat list, swipe left on a conversation to reveal delete. To mute notifications, open the chat, tap the contact name at the top, and adjust notification settings.',
  },
  {
    question: 'Why can\'t I see someone\'s last seen?',
    answer:
      'They may have hidden their last seen in their privacy settings. Similarly, if you hide your last seen, you will no longer see others\' last seen times.',
  },
  {
    question: 'Can I send photos, videos, and documents?',
    answer:
      'Yes. Tap the attachment icon (paperclip) in any chat to send images, videos, documents, or voice notes. All media is encrypted before sending.',
  },
  {
    question: 'Can I use z.chat on multiple devices?',
    answer:
      'Currently z.chat supports one active device per account. Multi-device support is coming in a future update.',
  },
  {
    question: 'My messages are not sending. What should I do?',
    answer:
      'Check your internet connection first. If the problem persists, try closing and reopening the app. If messages still fail, the recipient may have blocked you or there may be a temporary server issue.',
  },
  {
    question: 'Are group messages also encrypted?',
    answer:
      'Yes. Group messages use the same Signal Protocol encryption. Each message is individually encrypted for every group member.',
  },
  {
    question: 'How do I delete my account?',
    answer:
      'Go to Settings > Account > Delete My Account. This action is permanent and will delete all your data including messages, groups, and contacts.',
  },
  {
    question: 'What data does z.chat collect?',
    answer:
      'z.chat only stores your phone number and profile information you provide. Message content is end-to-end encrypted and never stored in readable form on our servers.',
  },
];

export default function SettingsHelpScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
            <Text style={styles.contactIcon}>{'\u2709'}</Text>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Email Support</Text>
              <Text style={styles.contactValue}>support@z.systems</Text>
            </View>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.contactRow, pressed && styles.pressed]}
            onPress={() => Linking.openURL('mailto:bugs@z.systems?subject=z.chat%20Bug%20Report')}
          >
            <Text style={styles.contactIcon}>{'\uD83D\uDC1B'}</Text>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Report a Problem</Text>
              <Text style={styles.contactValue}>bugs@z.systems</Text>
            </View>
          </Pressable>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <Pressable
            style={({ pressed }) => [styles.legalRow, pressed && styles.pressed]}
            onPress={() => Linking.openURL('https://z.systems/legal/terms')}
          >
            <Text style={styles.legalText}>Terms of Service</Text>
            <Text style={styles.chevron}>{'\u203A'}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.legalRow, pressed && styles.pressed]}
            onPress={() => Linking.openURL('https://z.systems/legal/privacy')}
          >
            <Text style={styles.legalText}>Privacy Policy</Text>
            <Text style={styles.chevron}>{'\u203A'}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.legalRow, pressed && styles.pressed]}
            onPress={() => Linking.openURL('https://z.systems/legal/licenses')}
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
    </SafeAreaView>
  );
}

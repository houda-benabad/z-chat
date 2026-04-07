import {
  View,
  Text,
  Pressable,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import { useAccountSettings } from '../hooks/useAccountSettings';
import { createStyles } from './styles/SettingsAccountScreen.styles';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';

export default function SettingsAccountScreen() {
  const styles = useThemedStyles(createStyles);
  const { appColors } = useAppSettings();
  const router = useRouter();
  const { handleDeleteAccount } = useAccountSettings();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>{'\u2190'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Account</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Privacy */}
        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={() => router.push('/settings-privacy')}
          >
            <Text style={styles.rowIcon}>{'\u{1F512}'}</Text>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Privacy</Text>
              <Text style={styles.rowSubtitle}>Last seen, read receipts, blocked contacts</Text>
            </View>
            <Text style={styles.chevron}>{'\u203A'}</Text>
          </Pressable>
        </View>

        {/* Security info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>{'\u{1F6E1}'}</Text>
            <Text style={styles.infoTitle}>End-to-End Encryption</Text>
            <Text style={styles.infoText}>
              Messages and calls are secured with end-to-end encryption using the Signal Protocol.
              Only you and the person you're communicating with can read or listen to them.
              Not even z.chat can access your messages.
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>{'\u{1F510}'}</Text>
            <Text style={styles.infoTitle}>Two-Step Verification</Text>
            <Text style={styles.infoText}>
              Your account is protected with phone-based OTP authentication.
              Each login session requires a fresh verification code sent to your phone number.
            </Text>
          </View>
        </View>

        {/* Danger zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: appColors.crimson }]}>Danger Zone</Text>
          <Pressable
            style={({ pressed }) => [styles.dangerRow, pressed && styles.dangerRowPressed]}
            onPress={handleDeleteAccount}
          >
            <Text style={styles.dangerText}>Delete My Account</Text>
            <Text style={styles.dangerSubtext}>
              Permanently delete your account and all associated data
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

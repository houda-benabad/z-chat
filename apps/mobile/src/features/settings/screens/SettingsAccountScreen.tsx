import {
  View,
  Text,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={appColors.primary} />
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
            <Ionicons name="lock-closed-outline" size={22} color={appColors.secondary} style={styles.rowIcon} />
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Privacy</Text>
              <Text style={styles.rowSubtitle}>Last seen, read receipts, blocked contacts</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={appColors.textSecondary} />
          </Pressable>
        </View>

        {/* Security info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.infoCard}>
            <Ionicons name="shield-checkmark-outline" size={24} color={appColors.secondary} style={styles.infoIcon} />
            <Text style={styles.infoTitle}>End-to-End Encryption</Text>
            <Text style={styles.infoText}>
              Messages and calls are secured with end-to-end encryption using the Signal Protocol.
              Only you and the person you're communicating with can read or listen to them.
              Not even z.chat can access your messages.
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="key-outline" size={24} color={appColors.secondary} style={styles.infoIcon} />
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
    </SafeAreaView>
  );
}

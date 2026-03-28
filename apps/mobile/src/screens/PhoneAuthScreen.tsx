import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '../theme';
import { authApi, ApiError } from '../services/api';

const COUNTRY_CODES = [
  { code: '+1', country: 'US', flag: '🇺🇸' },
  { code: '+44', country: 'GB', flag: '🇬🇧' },
  { code: '+33', country: 'FR', flag: '🇫🇷' },
  { code: '+49', country: 'DE', flag: '🇩🇪' },
  { code: '+81', country: 'JP', flag: '🇯🇵' },
  { code: '+86', country: 'CN', flag: '🇨🇳' },
  { code: '+91', country: 'IN', flag: '🇮🇳' },
  { code: '+55', country: 'BR', flag: '🇧🇷' },
  { code: '+61', country: 'AU', flag: '🇦🇺' },
  { code: '+971', country: 'AE', flag: '🇦🇪' },
];

export default function PhoneAuthScreen() {
  const router = useRouter();
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fullPhoneNumber = `${countryCode.code}${phoneNumber.replace(/\D/g, '')}`;
  const isValidPhone = phoneNumber.replace(/\D/g, '').length >= 7;

  const handleSendCode = useCallback(async () => {
    if (!isValidPhone) return;

    setIsLoading(true);
    try {
      await authApi.sendOtp(fullPhoneNumber);
      router.push({
        pathname: '/otp-verification',
        params: { phoneNumber: fullPhoneNumber },
      });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Failed to send verification code. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  }, [isValidPhone, fullPhoneNumber, router]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>

        <View style={styles.headerSection}>
          <Text style={styles.heading}>Enter your phone number</Text>
          <Text style={styles.subheading}>
            We'll send you a verification code to confirm your identity
          </Text>
        </View>

        <View style={styles.inputSection}>
          <View style={styles.phoneRow}>
            <Pressable
              style={styles.countrySelector}
              onPress={() => setShowCountryPicker(!showCountryPicker)}
            >
              <Text style={styles.countryFlag}>{countryCode.flag}</Text>
              <Text style={styles.countryCode}>{countryCode.code}</Text>
              <Text style={styles.dropdownArrow}>▾</Text>
            </Pressable>

            <TextInput
              style={styles.phoneInput}
              placeholder="Phone number"
              placeholderTextColor={colors.border}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoFocus
              maxLength={15}
            />
          </View>

          {showCountryPicker && (
            <View style={styles.countryList}>
              {COUNTRY_CODES.map((item) => (
                <Pressable
                  key={item.code}
                  style={[
                    styles.countryItem,
                    item.code === countryCode.code && styles.countryItemActive,
                  ]}
                  onPress={() => {
                    setCountryCode(item);
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={styles.countryItemFlag}>{item.flag}</Text>
                  <Text style={styles.countryItemName}>{item.country}</Text>
                  <Text style={styles.countryItemCode}>{item.code}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.bottomSection}>
          <Pressable
            onPress={handleSendCode}
            disabled={!isValidPhone || isLoading}
            style={({ pressed }) => [
              styles.buttonContainer,
              pressed && isValidPhone && styles.buttonPressed,
            ]}
          >
            <LinearGradient
              colors={
                isValidPhone
                  ? [colors.primary, '#D45A42']
                  : [colors.border, colors.border]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text
                  style={[
                    styles.buttonText,
                    !isValidPhone && styles.buttonTextDisabled,
                  ]}
                >
                  Send Verification Code
                </Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  backArrow: {
    fontSize: 20,
    color: colors.text,
  },
  headerSection: {
    marginBottom: spacing.xl,
  },
  heading: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subheading: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.regular,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  inputSection: {
    flex: 1,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countryFlag: {
    fontSize: 20,
  },
  countryCode: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  dropdownArrow: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  phoneInput: {
    flex: 1,
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.medium,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countryList: {
    marginTop: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  countryItemActive: {
    backgroundColor: colors.surface,
  },
  countryItemFlag: {
    fontSize: 20,
  },
  countryItemName: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.regular,
    color: colors.text,
  },
  countryItemCode: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  bottomSection: {
    marginTop: spacing.xl,
  },
  buttonContainer: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  button: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: borderRadius.xl,
  },
  buttonText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
  buttonTextDisabled: {
    color: colors.textSecondary,
  },
});

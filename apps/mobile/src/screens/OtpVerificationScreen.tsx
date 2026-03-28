import { useState, useRef, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { OTP_LENGTH } from '@z-chat/shared';
import { colors, spacing, typography, borderRadius } from '../theme';
import { authApi, tokenStorage, ApiError } from '../services/api';

const RESEND_COOLDOWN = 60;

export default function OtpVerificationScreen() {
  const router = useRouter();
  const { phoneNumber } = useLocalSearchParams<{ phoneNumber: string }>();
  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const fullCode = code.join('');
  const isCodeComplete = fullCode.length === OTP_LENGTH;

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleCodeChange = useCallback(
    (text: string, index: number) => {
      const digit = text.replace(/\D/g, '').slice(-1);
      const newCode = [...code];
      newCode[index] = digit;
      setCode(newCode);

      if (digit && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [code],
  );

  const handleKeyPress = useCallback(
    (key: string, index: number) => {
      if (key === 'Backspace' && !code[index] && index > 0) {
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      }
    },
    [code],
  );

  const handleVerify = useCallback(async () => {
    if (!isCodeComplete || !phoneNumber) return;

    setIsLoading(true);
    try {
      const response = await authApi.verifyOtp(phoneNumber, fullCode);
      await tokenStorage.save(response.token);

      if (response.user.isNewUser || !response.user.displayName) {
        router.replace('/profile-setup');
      } else {
        router.replace('/');
      }
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Invalid verification code. Please try again.';
      Alert.alert('Error', message);
      setCode(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  }, [isCodeComplete, phoneNumber, fullCode, router]);

  const handleResend = useCallback(async () => {
    if (resendTimer > 0 || !phoneNumber) return;

    try {
      await authApi.sendOtp(phoneNumber);
      setResendTimer(RESEND_COOLDOWN);
      setCode(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      Alert.alert('Code Sent', 'A new verification code has been sent.');
    } catch {
      Alert.alert('Error', 'Failed to resend code. Please try again.');
    }
  }, [resendTimer, phoneNumber]);

  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>

        <View style={styles.headerSection}>
          <Text style={styles.heading}>Verify your number</Text>
          <Text style={styles.subheading}>
            Enter the 6-digit code sent to{'\n'}
            <Text style={styles.phoneHighlight}>{phoneNumber}</Text>
          </Text>
        </View>

        <View style={styles.codeSection}>
          <View style={styles.codeRow}>
            {Array.from({ length: OTP_LENGTH }).map((_, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                style={[
                  styles.codeInput,
                  focusedIndex === index && styles.codeInputFocused,
                  code[index] !== '' && styles.codeInputFilled,
                ]}
                value={code[index]}
                onChangeText={(text) => handleCodeChange(text, index)}
                onKeyPress={({ nativeEvent }) =>
                  handleKeyPress(nativeEvent.key, index)
                }
                onFocus={() => setFocusedIndex(index)}
                keyboardType="number-pad"
                maxLength={1}
                autoFocus={index === 0}
                selectTextOnFocus
              />
            ))}
          </View>

          <View style={styles.resendSection}>
            {resendTimer > 0 ? (
              <Text style={styles.timerText}>
                Resend code in{' '}
                <Text style={styles.timerValue}>
                  {formatTimer(resendTimer)}
                </Text>
              </Text>
            ) : (
              <Pressable onPress={handleResend}>
                <Text style={styles.resendLink}>Resend code</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.bottomSection}>
          <Pressable
            onPress={handleVerify}
            disabled={!isCodeComplete || isLoading}
            style={({ pressed }) => [
              styles.buttonContainer,
              pressed && isCodeComplete && styles.buttonPressed,
            ]}
          >
            <LinearGradient
              colors={
                isCodeComplete
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
                    !isCodeComplete && styles.buttonTextDisabled,
                  ]}
                >
                  Verify
                </Text>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable onPress={() => router.back()}>
            <Text style={styles.changeNumberLink}>Change phone number</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
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
    marginBottom: spacing.xxl,
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
  phoneHighlight: {
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  codeSection: {
    flex: 1,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    textAlign: 'center',
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  codeInputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  codeInputFilled: {
    borderColor: colors.secondary,
    backgroundColor: colors.white,
  },
  resendSection: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  timerText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.regular,
    color: colors.textSecondary,
  },
  timerValue: {
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  resendLink: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  bottomSection: {
    alignItems: 'center',
    gap: spacing.md,
  },
  buttonContainer: {
    width: '100%',
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
  changeNumberLink: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.medium,
    color: colors.secondary,
  },
});

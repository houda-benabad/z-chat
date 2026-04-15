import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { OTP_LENGTH } from '@z-chat/shared';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { useOtpVerification } from '../hooks/useOtpVerification';
import { createStyles } from './styles/OtpVerificationScreen.styles';

export default function OtpVerificationScreen() {
  const styles = useThemedStyles(createStyles);
  const { appColors } = useAppSettings();
  const router = useRouter();
  const {
    code,
    isLoading,
    resendTimer,
    isFocused,
    setIsFocused,
    activeIndex,
    inputRef,
    phoneNumber,
    isCodeComplete,
    handleChangeText,
    focusInput,
    handleVerify,
    handleResend,
    formatTimer,
  } = useOtpVerification();

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
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={handleChangeText}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              maxLength={OTP_LENGTH}
              keyboardType="number-pad"
              autoFocus
              caretHidden
              contextMenuHidden
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              accessibilityLabel="Enter verification code"
              style={styles.hiddenInput}
            />
            {Array.from({ length: OTP_LENGTH }).map((_, index) => (
              <Pressable
                key={index}
                style={[
                  styles.codeInput,
                  isFocused && activeIndex === index && styles.codeInputFocused,
                  code.length > index && styles.codeInputFilled,
                ]}
                onPress={focusInput}
              >
                <Text style={styles.codeDigitText}>
                  {code[index] ?? ''}
                </Text>
              </Pressable>
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
                  ? [appColors.primary, '#D45A42']
                  : [appColors.border, appColors.border]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              {isLoading ? (
                <ActivityIndicator color={appColors.white} />
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

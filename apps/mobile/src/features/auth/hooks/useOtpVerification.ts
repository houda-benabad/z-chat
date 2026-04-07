import { useState, useRef, useEffect, useCallback } from 'react';
import { Alert, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { OTP_LENGTH } from '@z-chat/shared';
import { authApi, tokenStorage, userApi, ApiError } from '@/shared/services/api';
import { getOrCreateKeyPair } from '@/shared/services/crypto';
import { useUserProfile } from '@/shared/context/UserProfileContext';

const RESEND_COOLDOWN = 60;

export interface UseOtpVerificationReturn {
  code: string[];
  isLoading: boolean;
  resendTimer: number;
  focusedIndex: number;
  setFocusedIndex: (i: number) => void;
  inputRefs: React.MutableRefObject<(TextInput | null)[]>;
  phoneNumber: string;
  isCodeComplete: boolean;
  handleCodeChange: (text: string, index: number) => void;
  handleKeyPress: (key: string, index: number) => void;
  handleVerify: () => Promise<void>;
  handleResend: () => Promise<void>;
  formatTimer: (seconds: number) => string;
}

export function useOtpVerification(): UseOtpVerificationReturn {
  const router = useRouter();
  const { phoneNumber } = useLocalSearchParams<{ phoneNumber: string }>();
  const { refreshProfile } = useUserProfile();
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
      await tokenStorage.save(response.accessToken);

      // Best-effort encryption init so returning users with a failed prior setup
      // get their keys initialized before landing on chat-list.
      try {
        const publicKey = await getOrCreateKeyPair();
        await userApi.uploadPublicKey(publicKey);
      } catch { /* profile-setup will retry if this fails */ }

      // Seed the global profile context now that we have a valid token.
      await refreshProfile();

      if (!response.user.name) {
        router.replace('/profile-setup');
      } else {
        router.replace('/chat-list');
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

  const formatTimer = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    code,
    isLoading,
    resendTimer,
    focusedIndex,
    setFocusedIndex,
    inputRefs,
    phoneNumber: phoneNumber ?? '',
    isCodeComplete,
    handleCodeChange,
    handleKeyPress,
    handleVerify,
    handleResend,
    formatTimer,
  };
}

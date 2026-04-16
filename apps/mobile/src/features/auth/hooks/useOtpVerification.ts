import { useState, useRef, useEffect, useCallback } from 'react';
import { TextInput } from 'react-native';
import { alert } from '@/shared/utils/alert';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { OTP_LENGTH } from '@z-chat/shared';
import { authApi, tokenStorage, userApi, ApiError } from '@/shared/services/api';
import { getOrCreateKeyPair } from '@/shared/services/crypto';
import { useUserProfile } from '@/shared/context/UserProfileContext';

const RESEND_COOLDOWN = 60;

export interface UseOtpVerificationReturn {
  code: string;
  isLoading: boolean;
  resendTimer: number;
  isFocused: boolean;
  setIsFocused: (focused: boolean) => void;
  activeIndex: number;
  inputRef: React.RefObject<TextInput | null>;
  phoneNumber: string;
  isCodeComplete: boolean;
  handleChangeText: (text: string) => void;
  focusInput: () => void;
  handleVerify: () => Promise<void>;
  handleResend: () => Promise<void>;
  formatTimer: (seconds: number) => string;
}

export function useOtpVerification(): UseOtpVerificationReturn {
  const router = useRouter();
  const { phoneNumber } = useLocalSearchParams<{ phoneNumber: string }>();
  const { refreshProfile } = useUserProfile();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const isCodeComplete = code.length === OTP_LENGTH;
  const activeIndex = Math.min(code.length, OTP_LENGTH - 1);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleChangeText = useCallback((text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setCode(digits);
  }, []);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleVerify = useCallback(async () => {
    if (!isCodeComplete || !phoneNumber) return;

    setIsLoading(true);
    try {
      const response = await authApi.verifyOtp(phoneNumber, code);
      await tokenStorage.save(response.accessToken);

      try {
        const publicKey = await getOrCreateKeyPair();
        await userApi.uploadPublicKey(publicKey);
      } catch { /* profile-setup will retry if this fails */ }

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
      alert('Error', message);
      setCode('');
      inputRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  }, [isCodeComplete, phoneNumber, code, router]);

  const handleResend = useCallback(async () => {
    if (resendTimer > 0 || !phoneNumber) return;

    try {
      await authApi.sendOtp(phoneNumber);
      setResendTimer(RESEND_COOLDOWN);
      setCode('');
      inputRef.current?.focus();
      alert('Code Sent', 'A new verification code has been sent.');
    } catch {
      alert('Error', 'Failed to resend code. Please try again.');
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
    isFocused,
    setIsFocused,
    activeIndex,
    inputRef,
    phoneNumber: phoneNumber ?? '',
    isCodeComplete,
    handleChangeText,
    focusInput,
    handleVerify,
    handleResend,
    formatTimer,
  };
}

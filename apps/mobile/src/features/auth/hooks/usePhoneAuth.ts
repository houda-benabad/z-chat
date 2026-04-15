import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { authApi, ApiError } from '@/shared/services/api';
import { COUNTRY_CODES, type CountryCode } from '@/constants';
import { stripTrunkPrefix } from '@/shared/utils';

export { COUNTRY_CODES, type CountryCode };

export interface UsePhoneAuthReturn {
  countryCode: CountryCode;
  setCountryCode: (c: CountryCode) => void;
  phoneNumber: string;
  setPhoneNumber: (p: string) => void;
  showCountryPicker: boolean;
  setShowCountryPicker: (v: boolean) => void;
  isLoading: boolean;
  error: string | null;
  fullPhoneNumber: string;
  isValidPhone: boolean;
  handleSendCode: () => Promise<void>;
}

export function usePhoneAuth(): UsePhoneAuthReturn {
  const router = useRouter();
  const [countryCode, setCountryCode] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const digitsOnly = phoneNumber.replace(/\D/g, '');
  const stripped = stripTrunkPrefix(digitsOnly);
  const fullPhoneNumber = `${countryCode.code}${stripped}`;
  const isValidPhone = stripped.length >= 7;

  const handleSendCode = useCallback(async () => {
    if (!isValidPhone) return;

    setIsLoading(true);
    setError(null);
    try {
      await authApi.sendOtp(fullPhoneNumber);
      router.push({
        pathname: '/otp-verification',
        params: { phoneNumber: fullPhoneNumber },
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Failed to send verification code. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [isValidPhone, fullPhoneNumber, router]);

  return {
    countryCode,
    setCountryCode,
    phoneNumber,
    setPhoneNumber,
    showCountryPicker,
    setShowCountryPicker,
    isLoading,
    error,
    fullPhoneNumber,
    isValidPhone,
    handleSendCode,
  };
}

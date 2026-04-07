import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { request, API_BASE_URL } from './client';
import { STORAGE_KEYS } from '../../../constants';
import type { SendOtpResponse, VerifyOtpResponse } from '../../../types';

// ─── Refresh token storage ────────────────────────────────────────────────────

export const refreshStorage = {
  save: (token: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, token);
  },

  get: (): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return Promise.resolve(localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN));
    }
    return SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
  },

  remove: (): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
  },
};

// ─── Raw token refresh (called by client.ts interceptor) ─────────────────────

export async function doRefreshToken(): Promise<string | null> {
  const rt = await refreshStorage.get();
  if (!rt) return null;
  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rt }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.accessToken ?? null;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  sendOtp: (phone: string): Promise<SendOtpResponse> =>
    request('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  verifyOtp: (phone: string, otp: string): Promise<VerifyOtpResponse> =>
    request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    }),
};

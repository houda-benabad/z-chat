import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const TOKEN_KEY = 'z_chat_jwt_token';

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.message ?? 'Request failed');
  }

  return response.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface SendOtpResponse {
  success: boolean;
  message: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    phoneNumber: string;
    displayName: string | null;
    avatarUrl: string | null;
    isNewUser: boolean;
  };
}

export interface UpdateProfileResponse {
  success: boolean;
  user: {
    id: string;
    phoneNumber: string;
    displayName: string;
    about: string | null;
    avatarUrl: string | null;
  };
}

export const authApi = {
  sendOtp: (phoneNumber: string): Promise<SendOtpResponse> =>
    request('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    }),

  verifyOtp: (phoneNumber: string, code: string): Promise<VerifyOtpResponse> =>
    request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, code }),
    }),

  updateProfile: (data: {
    displayName: string;
    about?: string;
    avatarUrl?: string;
  }): Promise<UpdateProfileResponse> =>
    request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

export const tokenStorage = {
  save: (token: string): Promise<void> =>
    SecureStore.setItemAsync(TOKEN_KEY, token),

  get: (): Promise<string | null> =>
    SecureStore.getItemAsync(TOKEN_KEY),

  remove: (): Promise<void> =>
    SecureStore.deleteItemAsync(TOKEN_KEY),
};

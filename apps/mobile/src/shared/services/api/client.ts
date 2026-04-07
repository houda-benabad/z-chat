import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { STORAGE_KEYS } from '../../../constants';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

// ─── Error class ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Token storage ────────────────────────────────────────────────────────────

export const tokenStorage = {
  save: (token: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(STORAGE_KEYS.JWT_TOKEN, token);
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(STORAGE_KEYS.JWT_TOKEN, token);
  },

  get: (): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return Promise.resolve(localStorage.getItem(STORAGE_KEYS.JWT_TOKEN));
    }
    return SecureStore.getItemAsync(STORAGE_KEYS.JWT_TOKEN);
  },

  remove: (): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(STORAGE_KEYS.JWT_TOKEN);
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(STORAGE_KEYS.JWT_TOKEN);
  },
};

// ─── Session expiry handler (registered by app root) ─────────────────────────

let _onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(cb: () => void) {
  _onSessionExpired = cb;
}

// ─── Token refresh queue ──────────────────────────────────────────────────────

let isRefreshing = false;
const refreshQueue: Array<(token: string | null) => void> = [];

function processRefreshQueue(token: string | null) {
  refreshQueue.splice(0).forEach((cb) => cb(token));
}

async function tryRefreshToken(): Promise<string | null> {
  // Import lazily to avoid circular dep (auth.ts imports client.ts)
  const { doRefreshToken, refreshStorage } = await import('./auth');

  if (isRefreshing) {
    return new Promise<string | null>((resolve) => refreshQueue.push(resolve));
  }

  isRefreshing = true;
  try {
    const newToken = await doRefreshToken();
    if (!newToken) {
      await tokenStorage.remove();
      await refreshStorage.remove();
      processRefreshQueue(null);
      _onSessionExpired?.();
      return null;
    }
    await tokenStorage.save(newToken);
    processRefreshQueue(newToken);
    return newToken;
  } catch {
    await tokenStorage.remove();
    const { refreshStorage: rs } = await import('./auth');
    await rs.remove();
    processRefreshQueue(null);
    _onSessionExpired?.();
    return null;
  } finally {
    isRefreshing = false;
  }
}

// ─── HTTP client ──────────────────────────────────────────────────────────────

async function fetchWithAuth(path: string, options: RequestInit, token: string | null): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await tokenStorage.get();
  const response = await fetchWithAuth(path, options, token);

  if (response.status === 401) {
    // Don't try to refresh on auth endpoints themselves
    if (path.startsWith('/auth/')) {
      const body = await response.json().catch(() => ({}));
      throw new ApiError(401, body.error?.message ?? body.message ?? 'Unauthorized');
    }

    const newToken = await tryRefreshToken();
    if (!newToken) {
      throw new ApiError(401, 'Session expired. Please log in again.');
    }

    const retried = await fetchWithAuth(path, options, newToken);
    if (!retried.ok) {
      const body = await retried.json().catch(() => ({}));
      throw new ApiError(retried.status, body.error?.message ?? body.message ?? 'Request failed');
    }
    return retried.json() as Promise<T>;
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      body.error?.message ?? body.message ?? 'Request failed',
    );
  }

  return response.json() as Promise<T>;
}

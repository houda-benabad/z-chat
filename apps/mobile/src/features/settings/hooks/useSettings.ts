import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { userApi, tokenStorage } from '@/shared/services/api';
import { disconnectSocket } from '@/shared/services/socket';
import type { UserProfile } from '@/types';

export interface UseSettingsReturn {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  handleLogout: () => Promise<void>;
}

export function useSettings(): UseSettingsReturn {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    disconnectSocket();
    await tokenStorage.remove();
    router.replace('/');
  };

  useEffect(() => {
    const load = async () => {
      try {
        const { user } = await userApi.getMe();
        setProfile(user);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return {
    profile,
    loading,
    error,
    handleLogout,
  };
}

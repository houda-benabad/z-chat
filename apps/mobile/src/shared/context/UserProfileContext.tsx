import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { userApi } from '../services/api';
import type { UserProfile } from '@/types';

interface UserProfileContextValue {
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: { name?: string; about?: string; avatar?: string }) => Promise<void>;
}

const DEFAULT: UserProfileContextValue = {
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  updateProfile: async () => {},
};

const UserProfileContext = createContext<UserProfileContextValue>(DEFAULT);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const { user } = await userApi.getMe();
      setProfile(user);
    } catch {
      // user not logged in yet — keep null
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (data: { name?: string; about?: string; avatar?: string }) => {
    const { user } = await userApi.updateProfile(data);
    setProfile(user);
  }, []);

  useEffect(() => { refreshProfile(); }, [refreshProfile]);

  return (
    <UserProfileContext.Provider value={{ profile, loading, refreshProfile, updateProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  return useContext(UserProfileContext);
}

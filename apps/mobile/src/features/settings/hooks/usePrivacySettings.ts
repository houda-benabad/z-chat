import { useState, useEffect, useCallback } from 'react';
import { settingsApi } from '@/shared/services/api';
import type { UserSettings } from '@/types';

type Visibility = 'everyone' | 'contacts' | 'nobody';

export const DISAPPEAR_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '24 hours', value: 86400 },
  { label: '7 days', value: 604800 },
  { label: '90 days', value: 7776000 },
];

export function usePrivacySettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { settings: data } = await settingsApi.getSettings();
        setSettings(data);
      } catch {
        // Handle
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const updatePrivacy = useCallback(
    async (update: Partial<UserSettings>) => {
      let previous: UserSettings | null = null;
      setSettings((prev) => {
        if (!prev) return prev;
        previous = prev;
        return { ...prev, ...update };
      });
      if (!previous) return;
      try {
        const { settings: updated } = await settingsApi.updatePrivacy(update);
        setSettings(updated);
      } catch {
        setSettings(previous);
      }
    },
    [],
  );

  const updateLastSeenVisibility = useCallback(
    (v: Visibility) => updatePrivacy({ lastSeenVisibility: v }),
    [updatePrivacy],
  );

  const updateProfilePhotoVisibility = useCallback(
    (v: Visibility) => updatePrivacy({ profilePhotoVisibility: v }),
    [updatePrivacy],
  );

  const updateAboutVisibility = useCallback(
    (v: Visibility) => updatePrivacy({ aboutVisibility: v }),
    [updatePrivacy],
  );

  const updateReadReceipts = useCallback(
    (v: boolean) => updatePrivacy({ readReceipts: v }),
    [updatePrivacy],
  );

  const updateDisappearTimer = useCallback(
    (v: number) => updatePrivacy({ defaultDisappearTimer: v }),
    [updatePrivacy],
  );

  return {
    settings,
    loading,
    updateLastSeenVisibility,
    updateProfilePhotoVisibility,
    updateAboutVisibility,
    updateReadReceipts,
    updateDisappearTimer,
  };
}

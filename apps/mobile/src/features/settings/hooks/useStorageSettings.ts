import { useState, useEffect, useCallback } from 'react';
import { settingsApi } from '@/shared/services/api';
import type { UserSettings } from '@/types';

export function useStorageSettings() {
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

  const update = useCallback(
    async (field: keyof UserSettings, value: boolean) => {
      if (!settings) return;
      const prev = settings;
      setSettings({ ...settings, [field]: value });
      try {
        const { settings: updated } = await settingsApi.updateStorage({ [field]: value });
        setSettings(updated);
      } catch {
        setSettings(prev);
      }
    },
    [settings],
  );

  return {
    settings,
    loading,
    update,
  };
}

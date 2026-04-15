import { useState, useEffect, useCallback } from 'react';
import { settingsApi } from '@/shared/services/api';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import type { UserSettings } from '@/types';

export function useNotificationSettings() {
  const { updateSettings: updateContext } = useAppSettings();
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
      updateContext({ [field]: value }); // optimistic sync to global context
      try {
        const { settings: updated } = await settingsApi.updateNotifications({ [field]: value });
        setSettings(updated);
        updateContext(updated); // confirm with server response
      } catch {
        setSettings(prev);
        updateContext(prev); // revert global context on error
      }
    },
    [settings, updateContext],
  );

  return {
    settings,
    loading,
    update,
  };
}

import { useState, useEffect, useCallback } from 'react';
import { settingsApi } from '@/shared/services/api';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import type { UserSettings } from '@/types';

export function useAppearanceSettings() {
  const { reload, updateSettings } = useAppSettings();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    settingsApi.getSettings()
      .then(({ settings: s }) => { if (!cancelled) setSettings(s); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const updateAppearance = useCallback(
    async (update: Partial<Pick<UserSettings, 'theme' | 'fontSize'>>) => {
      if (!settings) return;
      const prev = { theme: settings.theme, fontSize: settings.fontSize };
      setSettings({ ...settings, ...update });
      updateSettings(update);
      try {
        const { settings: updated } = await settingsApi.updateAppearance(update);
        setSettings(updated);
        reload();
      } catch {
        setSettings({ ...settings, ...prev });
        updateSettings(prev);
      }
    },
    [settings, reload, updateSettings],
  );

  return { settings, loading, updateAppearance };
}

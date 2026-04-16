import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';

import { colors as baseColors } from '@/theme';
import { settingsApi } from '../services/api';
import type { UserSettings } from '@/types';

const DARK_COLORS = {
  ...baseColors,
  background: '#0F0F0F',
  surface: '#242424',
  text: '#EFEFEF',
  textSecondary: '#9A9A9A',
  border: '#3A3A3A',
} as const;

type ResolvedTheme = 'light' | 'dark';

export type AppColors = typeof baseColors;

interface AppSettingsContextValue {
  theme: ResolvedTheme;
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large';
  /** Font size in points: small=13, medium=15, large=17 */
  fontSizePt: number;
  appColors: AppColors;
  settings: UserSettings | null;
  settingsLoaded: boolean;
  reload: () => void;
  updateSettings: (partial: Partial<UserSettings>) => void;
}

const DEFAULT: AppSettingsContextValue = {
  theme: 'light',
  accentColor: '#E46C53',
  fontSize: 'medium',
  fontSizePt: 15,
  appColors: baseColors,
  settings: null,
  settingsLoaded: false,
  reload: () => {},
  updateSettings: () => {},
};

const AppSettingsContext = createContext<AppSettingsContextValue>(DEFAULT);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const { settings: s } = await Promise.race([
        settingsApi.getSettings(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('settings-timeout')), 2500),
        ),
      ]);
      setSettings(s);
    } catch {
      // user not logged in or slow network — keep defaults so splash can hide
    } finally {
      setSettingsLoaded(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateSettings = useCallback((partial: Partial<UserSettings>) => {
    setSettings(prev => prev ? { ...prev, ...partial } : prev);
  }, []);

  const theme: ResolvedTheme = (settings?.theme as ResolvedTheme) ?? 'light';

  const accentColor = '#E46C53';
  const fontSize = settings?.fontSize ?? 'medium';
  const fontSizePt = fontSize === 'small' ? 13 : fontSize === 'large' ? 17 : 15;

  const appColors = useMemo<AppColors>(() => {
    const base = theme === 'dark' ? DARK_COLORS : baseColors;
    return { ...base, primary: accentColor };
  }, [theme]);

  return (
    <AppSettingsContext.Provider
      value={{
        theme,
        accentColor,
        fontSize,
        fontSizePt,
        appColors,
        settings,
        settingsLoaded,
        reload: load,
        updateSettings,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  return useContext(AppSettingsContext);
}

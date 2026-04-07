import { useMemo } from 'react';
import { useAppSettings, type AppColors } from '../context/AppSettingsContext';

export function useThemedStyles<T>(createStyles: (colors: AppColors) => T): T {
  const { appColors } = useAppSettings();
  return useMemo(() => createStyles(appColors), [appColors]);
}

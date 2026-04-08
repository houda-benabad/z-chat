import { StyleSheet } from 'react-native';
import { typography } from '@/theme';
import type { AppColors } from '@/shared/context/AppSettingsContext';

export const createStyles = (_colors: AppColors) => StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 6,
    paddingHorizontal: 32,
  },
  pill: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  text: {
    fontSize: 12,
    fontFamily: typography.fontFamily,
    color: '#fff',
    textAlign: 'center',
  },
});

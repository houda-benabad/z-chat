import { StyleSheet } from 'react-native';
import { typography } from '@/theme';
import type { AppColors } from '@/shared/context/AppSettingsContext';

export const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(237,47,60,0.2)',
  },
  text: { fontSize: 14, fontFamily: typography.fontFamily, color: colors.textSecondary },
  unblock: {
    fontSize: 14,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: '#ED2F3C',
  },
});

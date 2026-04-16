import { StyleSheet } from 'react-native';
import { typography } from '@/theme';
import type { AppColors } from '@/shared/context/AppSettingsContext';

export const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      paddingTop: 8,
      paddingHorizontal: 20,
      backgroundColor: colors.background,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      gap: 14,
    },
    rowText: {
      fontSize: 16,
      fontFamily: typography.fontFamily,
      color: colors.text,
    },
    rowTextDestructive: {
      color: '#ED2F3C',
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
  });

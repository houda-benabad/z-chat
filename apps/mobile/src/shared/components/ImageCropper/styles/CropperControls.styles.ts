import { StyleSheet } from 'react-native';
import type { AppColors } from '@/shared/context/AppSettingsContext';

export const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 12,
    },
    cancelButton: {
      paddingVertical: 10,
      paddingHorizontal: 8,
    },
    cancelText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontFamily: 'Inter',
    },
    confirmButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    confirmButtonDisabled: {
      opacity: 0.5,
    },
  });

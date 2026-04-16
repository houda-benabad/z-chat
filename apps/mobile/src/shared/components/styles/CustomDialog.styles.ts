import { StyleSheet } from 'react-native';
import { typography } from '@/theme';
import type { AppColors } from '@/shared/context/AppSettingsContext';

export const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      width: '100%',
      maxWidth: 320,
      paddingTop: 24,
      paddingHorizontal: 24,
      paddingBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    title: {
      fontSize: 17,
      fontFamily: typography.fontFamily,
      fontWeight: typography.weights.semibold,
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    message: {
      fontSize: 14,
      fontFamily: typography.fontFamily,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 20,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    buttonSingle: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonCancel: {
      backgroundColor: colors.border,
    },
    buttonDefault: {
      backgroundColor: '#E46C53',
    },
    buttonDestructive: {
      backgroundColor: '#ED2F3C',
    },
    buttonText: {
      fontSize: 15,
      fontFamily: typography.fontFamily,
      fontWeight: typography.weights.semibold,
    },
    buttonTextCancel: {
      color: colors.text,
    },
    buttonTextDefault: {
      color: '#FFFFFF',
    },
    buttonTextDestructive: {
      color: '#FFFFFF',
    },
  });

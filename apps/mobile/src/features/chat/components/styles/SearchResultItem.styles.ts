import { StyleSheet } from 'react-native';
import { typography } from '@/theme';
import type { AppColors } from '@/shared/context/AppSettingsContext';

export const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  body: {
    flex: 1,
    marginLeft: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  senderName: {
    fontSize: 13,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 11,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
  },
  preview: {
    fontSize: 14,
    fontFamily: typography.fontFamily,
    color: colors.text,
  },
  highlight: {
    backgroundColor: 'rgba(228,108,83,0.18)',
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
});

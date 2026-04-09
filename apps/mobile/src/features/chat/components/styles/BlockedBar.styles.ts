import { StyleSheet } from 'react-native';
import { typography } from '@/theme';
import type { AppColors } from '@/shared/context/AppSettingsContext';

export const createStyles = (colors: AppColors) => StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  notice: {
    fontSize: 12,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  unblockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(237,47,60,0.3)',
    marginBottom: 4,
  },
  unblockBtnPressed: {
    backgroundColor: 'rgba(237,47,60,0.08)',
  },
  unblockText: {
    fontSize: 13,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: '#ED2F3C',
    letterSpacing: 0.5,
  },
});

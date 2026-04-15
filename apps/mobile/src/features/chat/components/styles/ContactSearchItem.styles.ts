import { StyleSheet } from 'react-native';
import { typography } from '@/theme';
import type { AppColors } from '@/shared/context/AppSettingsContext';

export const createStyles = (colors: AppColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 16,
    paddingVertical: 11,
    backgroundColor: colors.background,
  },
  rowPressed: { backgroundColor: colors.surface },

  avatar: { marginRight: 14 },

  content: { flex: 1, justifyContent: 'center' },

  name: {
    fontSize: 16,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },

  phone: {
    fontSize: 14,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
    marginTop: 2,
  },

  separator: {
    position: 'absolute',
    bottom: 0,
    left: 16 + 50 + 14, // paddingLeft + avatarSize + marginRight
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});

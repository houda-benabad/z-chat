import { StyleSheet } from 'react-native';
import { typography } from '@/theme';
import type { AppColors } from '@/shared/context/AppSettingsContext';

export const createInviteStyles = (colors: AppColors) => StyleSheet.create({
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: 8,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  inviteButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.primary,
  },
  inviteButtonText: {
    fontSize: 13,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: '#fff',
  },
});

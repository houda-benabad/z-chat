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

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },

  name: {
    flex: 1,
    fontSize: 16,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginRight: 8,
  },

  time: {
    fontSize: 12,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
  },
  timeUnread: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },

  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  preview: {
    flex: 1,
    fontSize: 14,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
    marginRight: 8,
  },
  previewUnread: {
    color: colors.text,
    fontWeight: typography.weights.medium,
  },

  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    color: '#fff',
  },

  // Indented separator — starts after avatar (same as WhatsApp)
  separator: {
    position: 'absolute',
    bottom: 0,
    left: 16 + 50 + 14, // paddingLeft + avatarSize + marginRight
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },

  pin: { fontSize: 14, marginLeft: 6, color: colors.textSecondary },

  deleteAction: {
    backgroundColor: '#ED2F3C',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  deleteText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    marginTop: 4,
  },
});

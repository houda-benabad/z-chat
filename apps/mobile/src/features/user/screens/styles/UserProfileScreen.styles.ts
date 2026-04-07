import { StyleSheet, Dimensions } from 'react-native';
import { spacing, typography } from '@/theme';
import type { AppColors } from '@/shared/context/AppSettingsContext';

const CORAL = '#E46C53';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AVATAR_SIZE = 110;

export const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },

  // Hero gradient
  heroGradient: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  topBarBtn: { padding: 4 },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: '#fff',
  },
  avatarArea: {
    position: 'relative',
    marginBottom: 14,
  },
  avatarRing: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  avatarImg: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  avatarFallback: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 42,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    color: '#fff',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4ADE80',
    borderWidth: 2.5,
    borderColor: CORAL,
  },
  heroName: {
    fontSize: 22,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  heroStatus: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },

  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    gap: 12,
  },

  // Actions card
  actionsCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  actionBtnPressed: {
    backgroundColor: colors.border,
  },
  actionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  actionSep: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 16,
  },

  // Info card
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeading: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  infoIconWrap: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
    marginTop: 1,
  },
  infoContent: {
    flex: 1,
  },
  infoValue: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    color: colors.text,
    lineHeight: 20,
  },
  infoLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 44,
  },

  errorText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    color: '#ED2F3C',
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },

  // Blocked state
  blockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(237,47,60,0.75)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  blockedBadgeText: {
    fontSize: 12,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: '#fff',
  },
  actionsCardBlocked: {
    opacity: 0.5,
  },
  actionLabelDisabled: {
    color: colors.textSecondary,
  },
  blockedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(237,47,60,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  blockedCardText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  blockedCardUnlink: {
    color: '#ED2F3C',
    fontWeight: typography.weights.semibold,
  },

  // Menu
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    marginRight: 12,
    paddingVertical: 4,
    minWidth: 190,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 6,
  },
  menuItemIcon: { marginRight: 10 },
  menuItemText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
  },

  // Toast
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(30,30,30,0.82)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  toastText: {
    color: '#fff',
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
  },
});

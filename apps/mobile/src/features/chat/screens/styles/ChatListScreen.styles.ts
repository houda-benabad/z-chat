import { StyleSheet } from 'react-native';
import { typography } from '@/theme';
import type { AppColors } from '@/shared/context/AppSettingsContext';

export const createStyles = (colors: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconBtnPressed: { backgroundColor: colors.surface },

  // ── Search bar ──────────────────────────────────────────────────────────────
  searchBarWrap: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: typography.fontFamily,
    color: colors.text,
    padding: 0,
  },

  emptyContainer: { flex: 1 },

  // ── FAB ─────────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },

  // ── Bottom nav ──────────────────────────────────────────────────────────────
  navbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    gap: 2,
  },
  navLabel: {
    fontSize: 11,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  navLabelActive: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  // Active tab indicator — thin line at the top of the active tab
  navActiveBar: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.primary,
  },

  // ── Settings tab ────────────────────────────────────────────────────────────
  pressed: { backgroundColor: colors.surface },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 8,
    borderBottomColor: colors.surface,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileAvatarImage: { width: 64, height: 64, borderRadius: 32 },
  profileAvatarText: {
    fontSize: 24,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    color: '#fff',
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: 18,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  profileAbout: {
    fontSize: 14,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
    marginTop: 2,
  },
  section: { borderBottomWidth: 8, borderBottomColor: colors.surface },
  sectionTitle: {
    fontSize: 12,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowIcon: {
    width: 36,
    textAlign: 'center' as const,
    marginRight: 16,
  },
  rowContent: { flex: 1 },
  rowLabel: {
    fontSize: 16,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  rowSubtitle: {
    fontSize: 12,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
    marginTop: 1,
  },
  logoutLabel: {
    fontSize: 16,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.medium,
    color: '#ED2F3C',
    flex: 1,
  },
  appInfo: { alignItems: 'center', paddingVertical: 32 },
  appInfoText: {
    fontSize: 14,
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
  },
  appInfoVersion: {
    fontSize: 12,
    fontFamily: typography.fontFamily,
    color: colors.border,
    marginTop: 2,
  },
});

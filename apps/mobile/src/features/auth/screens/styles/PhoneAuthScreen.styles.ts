import { StyleSheet } from 'react-native';
import { spacing, typography, borderRadius } from '@/theme';
import type { AppColors } from '@/shared/context/AppSettingsContext';

export const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  backArrow: {
    fontSize: 20,
    color: colors.text,
  },
  headerSection: {
    marginBottom: spacing.xl,
  },
  heading: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subheading: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.regular,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  inputSection: {
  },
  phoneRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countryFlag: {
    fontSize: 20,
  },
  countryCode: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  dropdownArrow: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  phoneInput: {
    flex: 1,
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.medium,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countryList: {
    marginTop: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  countryItemActive: {
    backgroundColor: colors.surface,
  },
  countryItemFlag: {
    fontSize: 20,
  },
  countryItemName: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.regular,
    color: colors.text,
  },
  countryItemCode: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  bottomSection: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily,
    color: colors.crimson,
    textAlign: 'center',
  },
  buttonContainer: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  button: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: borderRadius.xl,
  },
  buttonText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
  buttonTextDisabled: {
    color: colors.textSecondary,
  },
});

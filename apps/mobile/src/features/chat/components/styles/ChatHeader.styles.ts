import { StyleSheet } from 'react-native';
import { typography } from '@/theme';
import type { AppColors } from '@/shared/context/AppSettingsContext';

export const createStyles = (_colors: AppColors) => StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: { padding: 4 },
  info: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: { width: 38, height: 38, borderRadius: 19 },
  avatarText: {
    fontSize: 14,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    color: '#fff',
  },
  text: { flex: 1 },
  name: {
    fontSize: 15,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: '#fff',
  },
  status: {
    fontSize: 12,
    fontFamily: typography.fontFamily,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  actionBtn: { padding: 4 },
});

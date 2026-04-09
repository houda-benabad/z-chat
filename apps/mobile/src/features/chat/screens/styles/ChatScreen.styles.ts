import { StyleSheet } from 'react-native';
import type { AppColors } from '@/shared/context/AppSettingsContext';

const CHAT_BG = '#ECE5DD';

export const createStyles = (colors: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: CHAT_BG },
  offlineBanner: {
    backgroundColor: '#F59E0B',
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  offlineBannerText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  msgList: { flex: 1, backgroundColor: CHAT_BG },
  msgContent: { paddingHorizontal: 10, paddingVertical: 12, flexGrow: 1 },
  loadingMore: { paddingVertical: 12, alignItems: 'center' },
  emptyMsgs: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginHorizontal: 40,
    backgroundColor: 'rgba(243,210,146,0.25)',
    borderRadius: 8,
  },
  emptyPillRow: {},
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
});

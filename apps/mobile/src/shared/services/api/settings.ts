import { request } from './client';
import type { UserSettings, BlockedUserItem } from '../../../types';

export const settingsApi = {
  getSettings: (): Promise<{ settings: UserSettings }> =>
    request('/settings'),

  updatePrivacy: (
    data: Partial<Pick<UserSettings,
      'lastSeenVisibility' | 'profilePhotoVisibility' | 'aboutVisibility' |
      'readReceipts' | 'defaultDisappearTimer'
    >>,
  ): Promise<{ settings: UserSettings }> =>
    request('/settings/privacy', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  updateNotifications: (
    data: Partial<Pick<UserSettings,
      'messageNotifications' | 'groupNotifications' | 'callNotifications' |
      'notificationSound' | 'notificationVibrate' | 'notificationPreview'
    >>,
  ): Promise<{ settings: UserSettings }> =>
    request('/settings/notifications', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  updateAppearance: (
    data: Partial<Pick<UserSettings, 'theme' | 'fontSize'>>,
  ): Promise<{ settings: UserSettings }> =>
    request('/settings/appearance', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  updateStorage: (
    data: Partial<Pick<UserSettings,
      'autoDownloadPhotos' | 'autoDownloadVideos' | 'autoDownloadDocuments'
    >>,
  ): Promise<{ settings: UserSettings }> =>
    request('/settings/storage', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getBlocked: (skip?: number, limit?: number): Promise<{ blocked: BlockedUserItem[]; hasMore: boolean }> => {
    const params = new URLSearchParams();
    if (skip) params.set('skip', String(skip));
    if (limit) params.set('limit', String(limit));
    const qs = params.toString();
    return request(`/settings/blocked${qs ? `?${qs}` : ''}`);
  },

  blockUser: (userId: string): Promise<{ message: string }> =>
    request('/settings/blocked', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  unblockUser: (userId: string): Promise<{ message: string }> =>
    request(`/settings/blocked/${userId}`, { method: 'DELETE' }),

  deleteAccount: (): Promise<{ message: string }> =>
    request('/settings/account', {
      method: 'DELETE',
      body: JSON.stringify({ confirmation: 'DELETE MY ACCOUNT' }),
    }),
};

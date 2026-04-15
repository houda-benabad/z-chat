import { request } from './client';
import type { CallRecord } from '../../../types';

export const callsApi = {
  getToken: (channelName: string, uid: number): Promise<{ token: string }> =>
    request('/calls/token', {
      method: 'POST',
      body: JSON.stringify({ channelName, uid }),
    }),

  getCallHistory: (cursor?: string, limit?: number): Promise<{
    calls: CallRecord[];
    hasMore: boolean;
    nextCursor: string | null;
  }> => {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    if (limit) params.set('limit', String(limit));
    const qs = params.toString();
    return request(`/calls${qs ? `?${qs}` : ''}`);
  },
};

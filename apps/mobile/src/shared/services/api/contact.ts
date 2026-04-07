import { request } from './client';
import type { ContactItem, SyncedUser } from '../../../types';

export const contactApi = {
  getContacts: (skip?: number, limit?: number): Promise<{ contacts: ContactItem[]; hasMore: boolean }> => {
    const params = new URLSearchParams();
    if (skip) params.set('skip', String(skip));
    if (limit) params.set('limit', String(limit));
    const qs = params.toString();
    return request(`/contacts${qs ? `?${qs}` : ''}`);
  },

  addContact: (phone: string, nickname?: string): Promise<{ contact: ContactItem }> =>
    request('/contacts', {
      method: 'POST',
      body: JSON.stringify({ phone, ...(nickname ? { nickname } : {}) }),
    }),

  deleteContact: (id: string): Promise<{ message: string }> =>
    request(`/contacts/${id}`, { method: 'DELETE' }),

  syncContacts: (phones: string[]): Promise<{ users: SyncedUser[] }> =>
    request('/contacts/sync', {
      method: 'POST',
      body: JSON.stringify({ phones }),
    }),
};

import { request } from './client';
import type { ChatData, ChatParticipant, GroupInfo } from '../../../types';

export const groupApi = {
  createGroup: (data: {
    name: string;
    description?: string;
    avatar?: string;
    memberIds: string[];
  }): Promise<{ chat: ChatData }> =>
    request('/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getGroupInfo: (chatId: string): Promise<{ group: GroupInfo }> =>
    request(`/groups/${chatId}`),

  updateGroup: (
    chatId: string,
    data: { name?: string; description?: string; avatar?: string | null },
  ): Promise<{ chat: ChatData }> =>
    request(`/groups/${chatId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  addMembers: (chatId: string, memberIds: string[]): Promise<{ chat: ChatData }> =>
    request(`/groups/${chatId}/members`, {
      method: 'POST',
      body: JSON.stringify({ memberIds }),
    }),

  removeMember: (chatId: string, userId: string): Promise<{ message: string }> =>
    request(`/groups/${chatId}/members/${userId}`, { method: 'DELETE' }),

  updateMemberRole: (
    chatId: string,
    userId: string,
    role: string,
  ): Promise<{ participant: ChatParticipant }> =>
    request(`/groups/${chatId}/members/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  distributeKeys: (
    chatId: string,
    keys: { userId: string; encryptedKey: string }[],
    version: number,
  ): Promise<{ message: string; version: number }> =>
    request(`/groups/${chatId}/keys`, {
      method: 'POST',
      body: JSON.stringify({ keys, version }),
    }),
};

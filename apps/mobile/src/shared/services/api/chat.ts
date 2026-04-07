import { request } from './client';
import type { ChatListItem, ChatData, MessagesResponse, ChatParticipantUser } from '../../../types';

export const chatApi = {
  getChats: (cursor?: string, limit?: number): Promise<{ chats: ChatListItem[]; hasMore: boolean; nextCursor: string | null }> => {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    if (limit) params.set('limit', String(limit));
    const qs = params.toString();
    return request(`/chats${qs ? `?${qs}` : ''}`);
  },

  createChat: (participantId: string): Promise<{ chat: ChatData }> =>
    request('/chats', {
      method: 'POST',
      body: JSON.stringify({ participantId }),
    }),

  getMessages: (chatId: string, cursor?: string): Promise<MessagesResponse> =>
    request(`/chats/${chatId}/messages${cursor ? `?cursor=${cursor}` : ''}`),

  searchUser: (phone: string): Promise<{ user: ChatParticipantUser }> =>
    request(`/users/search?phone=${encodeURIComponent(phone)}`),

  deleteConversation: (chatId: string): Promise<{ message: string }> =>
    request(`/chats/${chatId}`, { method: 'DELETE' }),

  deleteMessage: (chatId: string, messageId: string): Promise<{ message: string }> =>
    request(`/chats/${chatId}/messages/${messageId}`, { method: 'DELETE' }),

  searchMessages: (chatId: string, query: string): Promise<{ messages: import('../../../types').ChatMessage[] }> =>
    request(`/chats/${chatId}/messages/search?q=${encodeURIComponent(query)}`),
};

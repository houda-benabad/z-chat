import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const TOKEN_KEY = 'z_chat_jwt_token';

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.message ?? 'Request failed');
  }

  return response.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface SendOtpResponse {
  success: boolean;
  message: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    phoneNumber: string;
    displayName: string | null;
    avatarUrl: string | null;
    isNewUser: boolean;
  };
}

export interface UpdateProfileResponse {
  success: boolean;
  user: {
    id: string;
    phoneNumber: string;
    displayName: string;
    about: string | null;
    avatarUrl: string | null;
  };
}

export const authApi = {
  sendOtp: (phoneNumber: string): Promise<SendOtpResponse> =>
    request('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    }),

  verifyOtp: (phoneNumber: string, code: string): Promise<VerifyOtpResponse> =>
    request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, code }),
    }),

  updateProfile: (data: {
    displayName: string;
    about?: string;
    avatarUrl?: string;
  }): Promise<UpdateProfileResponse> =>
    request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

export interface ChatParticipantUser {
  id: string;
  phone: string;
  name: string | null;
  avatar: string | null;
  isOnline: boolean;
  lastSeen: string;
}

export interface ChatParticipant {
  id: string;
  chatId: string;
  userId: string;
  lastReadMessageId: string | null;
  isPinned: boolean;
  user: ChatParticipantUser;
}

export interface MessageSender {
  id: string;
  name: string | null;
  avatar?: string | null;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  type: string;
  content: string | null;
  mediaUrl: string | null;
  replyToId: string | null;
  isForwarded: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  sender: MessageSender;
  replyTo?: { id: string; content: string | null; senderId: string; type: string } | null;
}

export interface ChatListItem {
  id: string;
  type: string;
  participants: ChatParticipant[];
  lastMessage: ChatMessage | null;
  unreadCount: number;
  isPinned: boolean;
  updatedAt: string;
}

export interface ChatData {
  id: string;
  type: string;
  participants: ChatParticipant[];
}

export const chatApi = {
  getChats: (): Promise<{ chats: ChatListItem[] }> =>
    request('/chats'),

  createChat: (participantId: string): Promise<{ chat: ChatData }> =>
    request('/chats', {
      method: 'POST',
      body: JSON.stringify({ participantId }),
    }),

  getMessages: (chatId: string, cursor?: string): Promise<{ messages: ChatMessage[]; nextCursor: string | null }> =>
    request(`/chats/${chatId}/messages${cursor ? `?cursor=${cursor}` : ''}`),

  searchUser: (phone: string): Promise<{ user: ChatParticipantUser }> =>
    request(`/users/search?phone=${encodeURIComponent(phone)}`),
};

export interface ContactItem {
  id: string;
  userId: string;
  contactUserId: string;
  nickname: string | null;
  createdAt: string;
  contactUser: {
    id: string;
    phone: string;
    name: string | null;
    avatar: string | null;
    about: string | null;
    isOnline: boolean;
    lastSeen: string;
  };
}

export interface SyncedUser {
  id: string;
  phone: string;
  name: string | null;
  avatar: string | null;
  isOnline: boolean;
  lastSeen: string;
  isContact: boolean;
}

export const contactApi = {
  getContacts: (): Promise<{ contacts: ContactItem[] }> =>
    request('/contacts'),

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

export const tokenStorage = {
  save: (token: string): Promise<void> =>
    SecureStore.setItemAsync(TOKEN_KEY, token),

  get: (): Promise<string | null> =>
    SecureStore.getItemAsync(TOKEN_KEY),

  remove: (): Promise<void> =>
    SecureStore.deleteItemAsync(TOKEN_KEY),
};

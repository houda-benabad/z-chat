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
    throw new ApiError(response.status, body.error?.message ?? body.message ?? 'Request failed');
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
  message: string;
}

export interface VerifyOtpResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    phone: string;
    name: string | null;
    about: string | null;
    avatar: string | null;
  };
}

export const authApi = {
  sendOtp: (phone: string): Promise<SendOtpResponse> =>
    request('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  verifyOtp: (phone: string, otp: string): Promise<VerifyOtpResponse> =>
    request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
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
  name: string | null;
  avatar: string | null;
  description: string | null;
  createdBy: string | null;
  participants: ChatParticipant[];
  lastMessage: ChatMessage | null;
  unreadCount: number;
  isPinned: boolean;
  updatedAt: string;
}

export interface ChatData {
  id: string;
  type: string;
  name: string | null;
  avatar: string | null;
  description: string | null;
  createdBy: string | null;
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

export interface GroupInfo {
  id: string;
  name: string;
  description: string | null;
  avatar: string | null;
  createdBy: string | null;
  creator: { id: string; name: string | null; phone: string } | null;
  createdAt: string;
  participants: (ChatParticipant & { role: string })[];
  memberCount: number;
}

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

  updateGroup: (chatId: string, data: {
    name?: string;
    description?: string;
    avatar?: string | null;
  }): Promise<{ chat: ChatData }> =>
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

  updateMemberRole: (chatId: string, userId: string, role: string): Promise<{ participant: ChatParticipant }> =>
    request(`/groups/${chatId}/members/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
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

// --- Settings ---

export interface UserSettings {
  id: string;
  userId: string;
  lastSeenVisibility: 'everyone' | 'contacts' | 'nobody';
  profilePhotoVisibility: 'everyone' | 'contacts' | 'nobody';
  aboutVisibility: 'everyone' | 'contacts' | 'nobody';
  readReceipts: boolean;
  defaultDisappearTimer: number;
  messageNotifications: boolean;
  groupNotifications: boolean;
  callNotifications: boolean;
  notificationSound: boolean;
  notificationVibrate: boolean;
  notificationPreview: boolean;
  theme: 'light' | 'dark' | 'system';
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large';
  autoDownloadPhotos: boolean;
  autoDownloadVideos: boolean;
  autoDownloadDocuments: boolean;
}

export interface BlockedUserItem {
  id: string;
  userId: string;
  blockedUserId: string;
  createdAt: string;
  blockedUser: {
    id: string;
    phone: string;
    name: string | null;
    avatar: string | null;
  };
}

export interface UserProfile {
  id: string;
  phone: string;
  name: string | null;
  about: string | null;
  avatar: string | null;
  createdAt: string;
}

export const settingsApi = {
  getSettings: (): Promise<{ settings: UserSettings }> =>
    request('/settings'),

  updatePrivacy: (data: Partial<Pick<UserSettings,
    'lastSeenVisibility' | 'profilePhotoVisibility' | 'aboutVisibility' | 'readReceipts' | 'defaultDisappearTimer'
  >>): Promise<{ settings: UserSettings }> =>
    request('/settings/privacy', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  updateNotifications: (data: Partial<Pick<UserSettings,
    'messageNotifications' | 'groupNotifications' | 'callNotifications' | 'notificationSound' | 'notificationVibrate' | 'notificationPreview'
  >>): Promise<{ settings: UserSettings }> =>
    request('/settings/notifications', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  updateAppearance: (data: Partial<Pick<UserSettings,
    'theme' | 'accentColor' | 'fontSize'
  >>): Promise<{ settings: UserSettings }> =>
    request('/settings/appearance', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  updateStorage: (data: Partial<Pick<UserSettings,
    'autoDownloadPhotos' | 'autoDownloadVideos' | 'autoDownloadDocuments'
  >>): Promise<{ settings: UserSettings }> =>
    request('/settings/storage', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getBlocked: (): Promise<{ blocked: BlockedUserItem[] }> =>
    request('/settings/blocked'),

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

export const userApi = {
  getMe: (): Promise<{ user: UserProfile }> =>
    request('/users/me'),

  updateProfile: (data: { name?: string; about?: string; avatar?: string }): Promise<{ user: UserProfile }> =>
    request('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
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

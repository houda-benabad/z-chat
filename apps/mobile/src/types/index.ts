// ─── Auth ─────────────────────────────────────────────────────────────────────

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

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatParticipantUser {
  id: string;
  phone: string;
  name: string | null;
  avatar: string | null;
  isOnline: boolean;
  lastSeen: string;
  publicKey?: string | null;
}

export interface ChatParticipant {
  id: string;
  chatId: string;
  userId: string;
  lastReadMessageId: string | null;
  isPinned: boolean;
  encryptedGroupKey?: string | null;
  groupKeyVersion?: number;
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
  disappearsAt: string | null;
  createdAt: string;
  updatedAt: string;
  sender: MessageSender;
  replyTo?: { id: string; content: string | null; senderId: string; type: string } | null;
  /** Client-only: true while the message is awaiting server ack */
  pending?: boolean;
  /** Client-only: true when the server ack returned an error */
  failed?: boolean;
  /** Client-only: local file URI for retrying a failed media upload */
  localUri?: string;
  /** Client-only: MIME type for retrying a failed media upload */
  localMimeType?: string;
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

export interface MessagesResponse {
  messages: ChatMessage[];
  nextCursor: string | null;
  participants: {
    userId: string;
    lastReadMessageId: string | null;
    encryptedGroupKey?: string | null;
    groupKeyVersion?: number;
    user: { isOnline: boolean; publicKey?: string | null; phone: string; name: string | null };
  }[];
}

// ─── Group ────────────────────────────────────────────────────────────────────

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
  myEncryptedGroupKey?: string | null;
  groupKeyVersion?: number;
}

// ─── Contact ──────────────────────────────────────────────────────────────────

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

// ─── Settings ─────────────────────────────────────────────────────────────────

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
  theme: 'light' | 'dark';
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large';
  autoDownloadPhotos: boolean;
  autoDownloadVideos: boolean;
  autoDownloadDocuments: boolean;
}

export interface StarredMessageItem {
  id: string;
  messageId: string;
  createdAt: string;
  message: ChatMessage & {
    chat: { id: string; type: string; name: string | null; avatar: string | null };
  };
  encryptedGroupKey: string | null;
  recipientPublicKey: string | null;
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

// ─── User ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  phone: string;
  name: string | null;
  about: string | null;
  avatar: string | null;
  createdAt: string;
}

export interface PublicUserProfile {
  id: string;
  phone: string;
  name: string | null;
  about: string | null;
  avatar: string | null;
  isOnline: boolean;
  lastSeen: string;
  publicKey?: string | null;
}

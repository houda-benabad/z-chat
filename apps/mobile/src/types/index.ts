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
  /** Client-only: true when the message was rejected because the recipient has blocked the sender */
  blockedByRecipient?: boolean;
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
    user: { isOnline: boolean; publicKey?: string | null; phone: string; name: string | null; avatar: string | null };
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

// ─── Phone Book ──────────────────────────────────────────────────────────────

export interface PhoneBookContact {
  id: string;
  name: string;
  phones: string[];
  normalizedPhones: string[];
  imageUri?: string;
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
  recipientId: string | null;
  recipientAvatar: string | null;
  recipientName: string | null;
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

// ─── Call ─────────────────────────────────────────────────────────────────────

export type CallType = 'VOICE' | 'VIDEO';
export type CallStatus = 'RINGING' | 'ONGOING' | 'ENDED' | 'MISSED' | 'REJECTED' | 'NO_ANSWER' | 'BUSY';
export type EndReason = 'CALLER_HANGUP' | 'CALLEE_HANGUP' | 'NETWORK_ERROR' | 'TIMEOUT';

export interface CallUser {
  id: string;
  phone: string;
  name: string | null;
  avatar: string | null;
}

export interface CallRecord {
  id: string;
  callerId: string;
  calleeId: string | null;
  chatId: string | null;
  channelName: string;
  type: CallType;
  status: CallStatus;
  startedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  duration: number | null;
  endReason: EndReason | null;
  caller: CallUser;
  callee: CallUser | null;
}

export interface IncomingCallData {
  callId: string;
  channelName: string;
  callerId: string;
  caller: CallUser;
  chatId?: string;
  type: CallType;
  isGroup: boolean;
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

export interface User {
  id: string;
  phoneNumber: string;
  displayName: string;
  about: string | null;
  avatarUrl: string | null;
  lastSeen: Date;
  isOnline: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  deviceId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface Device {
  id: string;
  userId: string;
  pushToken: string | null;
  platform: 'ios' | 'android';
  identityKey: string;
  signedPreKey: string;
  createdAt: Date;
}

export type ChatType = 'direct' | 'group';

export interface Chat {
  id: string;
  type: ChatType;
  groupId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatParticipant {
  id: string;
  chatId: string;
  userId: string;
  joinedAt: Date;
  lastReadMessageId: string | null;
}

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'voice_note';

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  type: MessageType;
  content: string | null;
  mediaUrl: string | null;
  replyToId: string | null;
  isForwarded: boolean;
  isStarred: boolean;
  isDeleted: boolean;
  disappearsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type GroupRole = 'admin' | 'member';

export interface Group {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: GroupRole;
  joinedAt: Date;
}

export interface Contact {
  id: string;
  userId: string;
  contactUserId: string;
  nickname: string | null;
  createdAt: Date;
}

export interface BlockedUser {
  id: string;
  userId: string;
  blockedUserId: string;
  createdAt: Date;
}

export interface CallLog {
  id: string;
  chatId: string;
  callerId: string;
  callType: 'voice' | 'video';
  status: 'missed' | 'answered' | 'declined' | 'busy';
  startedAt: Date;
  endedAt: Date | null;
  duration: number | null;
}

// Barrel — re-export everything so existing imports (`from '../services/api'`)
// continue to work without modification.

export { ApiError, tokenStorage, request, API_BASE_URL } from './client';
export { authApi } from './auth';
export { chatApi } from './chat';
export { groupApi } from './group';
export { contactApi } from './contact';
export { settingsApi } from './settings';
export { userApi, uploadAvatar, uploadMedia } from './user';
export { callsApi } from './calls';

// Re-export all types for convenience
export type {
  SendOtpResponse,
  VerifyOtpResponse,
  ChatParticipantUser,
  ChatParticipant,
  MessageSender,
  ChatMessage,
  ChatListItem,
  ChatData,
  MessagesResponse,
  GroupInfo,
  ContactItem,
  SyncedUser,
  UserSettings,
  BlockedUserItem,
  UserProfile,
  PublicUserProfile,
  CallRecord,
  CallUser,
  IncomingCallData,
} from '../../../types';

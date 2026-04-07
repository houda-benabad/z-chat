// Re-export from the single source of truth in shared/utils.
// Keep this barrel so existing imports inside the chat feature don't break.
export { getChatPreview, getOtherParticipantUser, isSameDay } from '@/shared/utils';

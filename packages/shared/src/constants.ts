export const APP_NAME = 'z.chat';
export const COMPANY_NAME = 'z.systems';
export const COMPANY_MISSION = 'Redefining the game, one trade at a time';

export const OTP_LENGTH = 6;
export const OTP_EXPIRY_SECONDS = 300;

export const MAX_GROUP_MEMBERS = 256;
export const MAX_MESSAGE_LENGTH = 4096;
export const MAX_DISPLAY_NAME_LENGTH = 50;
export const MAX_ABOUT_LENGTH = 140;

export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'] as const;
export const SUPPORTED_DOCUMENT_TYPES = ['application/pdf', 'application/msword'] as const;

export const MAX_FILE_SIZE_MB = 100;

export const DISAPPEARING_MESSAGE_OPTIONS = [
  { label: 'Off', seconds: 0 },
  { label: '24 hours', seconds: 86400 },
  { label: '7 days', seconds: 604800 },
  { label: '90 days', seconds: 7776000 },
] as const;

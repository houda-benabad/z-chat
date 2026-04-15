import { z } from "zod";

const phoneRegex = /^\+[1-9]\d{6,14}$/;

export const sendOtpSchema = z.object({
  phone: z.string().regex(phoneRegex, "Invalid phone number format. Use E.164 format (e.g. +1234567890)"),
});

export const verifyOtpSchema = z.object({
  phone: z.string().regex(phoneRegex, "Invalid phone number format"),
  otp: z.string().length(6, "OTP must be 6 digits").regex(/^\d{6}$/, "OTP must be numeric"),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  about: z.string().max(500).optional(),
  avatar: z.string().url().nullable().optional(),
});

export const createChatSchema = z.object({
  participantId: z.string().uuid("Invalid participant ID"),
});

export const sendMessageSchema = z.object({
  chatId: z.string().uuid("Invalid chat ID"),
  type: z.enum(["text", "image", "video", "audio", "document", "voice_note"]).default("text"),
  content: z.string().max(4096).optional(),
  mediaUrl: z.string().url().optional(),
  replyToId: z.string().uuid().optional(),
  isForwarded: z.boolean().optional(),
}).refine((d) => d.content || d.mediaUrl, {
  message: "Message must have content or media",
});

export const uploadPublicKeySchema = z.object({
  publicKey: z.string().min(40).max(100), // base64 X25519 public key (44 chars)
});

export const searchByPhoneSchema = z.object({
  phone: z.string().regex(phoneRegex, "Invalid phone number format. Use E.164 format"),
});

export const pushTokenSchema = z.object({
  pushToken: z.string().min(1).max(200).nullable(),
});

export const distributeGroupKeysSchema = z.object({
  keys: z.array(z.object({
    userId: z.string().uuid(),
    encryptedKey: z.string().min(1),
  })).min(1).max(256),
  version: z.number().int().min(1),
});

export const markReadSchema = z.object({
  chatId: z.string().uuid("Invalid chat ID"),
  messageId: z.string().uuid("Invalid message ID"),
});

export const addContactSchema = z.object({
  phone: z.string().regex(phoneRegex, "Invalid phone number format. Use E.164 format"),
  nickname: z.string().max(100).optional(),
});

export const updateContactNicknameSchema = z.object({
  nickname: z.string().max(100),
});

export const syncContactsSchema = z.object({
  phones: z.array(z.string().regex(phoneRegex)).min(1).max(500),
});

export const createGroupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(100),
  description: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
  memberIds: z.array(z.string().uuid()).min(1, "At least one member required").max(256),
});

export const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  avatar: z.string().url().nullable().optional(),
});

export const addMembersSchema = z.object({
  memberIds: z.array(z.string().uuid()).min(1).max(256),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["admin", "member"]),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type AddMembersInput = z.infer<typeof addMembersSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

export const generateCallTokenSchema = z.object({
  channelName: z.string().min(1).max(200),
  uid: z.number().int().min(0),
});

export type GenerateCallTokenInput = z.infer<typeof generateCallTokenSchema>;

export type AddContactInput = z.infer<typeof addContactSchema>;
export type SyncContactsInput = z.infer<typeof syncContactsSchema>;
export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateChatInput = z.infer<typeof createChatSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type MarkReadInput = z.infer<typeof markReadSchema>;

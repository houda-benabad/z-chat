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
  avatar: z.string().url().optional(),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

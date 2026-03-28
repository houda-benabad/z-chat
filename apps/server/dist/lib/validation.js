"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = exports.refreshSchema = exports.verifyOtpSchema = exports.sendOtpSchema = void 0;
const zod_1 = require("zod");
const phoneRegex = /^\+[1-9]\d{6,14}$/;
exports.sendOtpSchema = zod_1.z.object({
    phone: zod_1.z.string().regex(phoneRegex, "Invalid phone number format. Use E.164 format (e.g. +1234567890)"),
});
exports.verifyOtpSchema = zod_1.z.object({
    phone: zod_1.z.string().regex(phoneRegex, "Invalid phone number format"),
    otp: zod_1.z.string().length(6, "OTP must be 6 digits").regex(/^\d{6}$/, "OTP must be numeric"),
});
exports.refreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, "Refresh token is required"),
});
exports.updateProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100).optional(),
    about: zod_1.z.string().max(500).optional(),
    avatar: zod_1.z.string().url().optional(),
});
//# sourceMappingURL=validation.js.map
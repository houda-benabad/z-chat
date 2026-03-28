"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthRouter = createAuthRouter;
const express_1 = require("express");
const redis_1 = require("../lib/redis");
const tokens_1 = require("../lib/tokens");
const errors_1 = require("../lib/errors");
const asyncHandler_1 = require("../lib/asyncHandler");
const validate_1 = require("../middleware/validate");
const rateLimit_1 = require("../middleware/rateLimit");
const validation_1 = require("../lib/validation");
const OTP_TTL = 5 * 60; // 5 minutes
function createAuthRouter(prisma, jwtSecret, jwtRefreshSecret) {
    const router = (0, express_1.Router)();
    // POST /auth/send-otp
    router.post("/send-otp", (0, validate_1.validate)(validation_1.sendOtpSchema), rateLimit_1.otpRateLimit, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const { phone } = req.body;
        const redis = (0, redis_1.getRedis)();
        const otp = (0, tokens_1.generateOtp)();
        await redis.set(`otp:${phone}`, otp, "EX", OTP_TTL);
        // Mock Twilio — log OTP instead of sending SMS
        console.log(`[Mock Twilio] OTP for ${phone}: ${otp}`);
        res.json({ message: "OTP sent successfully" });
    }));
    // POST /auth/verify-otp
    router.post("/verify-otp", (0, validate_1.validate)(validation_1.verifyOtpSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const { phone, otp } = req.body;
        const redis = (0, redis_1.getRedis)();
        const storedOtp = await redis.get(`otp:${phone}`);
        if (!storedOtp || storedOtp !== otp) {
            throw new errors_1.AppError(401, "Invalid or expired OTP", "INVALID_OTP");
        }
        await redis.del(`otp:${phone}`);
        // Create user if new
        let user = await prisma.user.findUnique({ where: { phone } });
        if (!user) {
            user = await prisma.user.create({ data: { phone } });
        }
        const accessToken = (0, tokens_1.signAccessToken)({ sub: user.id, phone: user.phone }, jwtSecret);
        const refreshTokenJwt = (0, tokens_1.signRefreshToken)({ sub: user.id }, jwtRefreshSecret);
        await prisma.refreshToken.create({
            data: {
                token: refreshTokenJwt,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });
        res.json({
            accessToken,
            refreshToken: refreshTokenJwt,
            user: {
                id: user.id,
                phone: user.phone,
                name: user.name,
                about: user.about,
                avatar: user.avatar,
            },
        });
    }));
    // POST /auth/refresh
    router.post("/refresh", (0, validate_1.validate)(validation_1.refreshSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const { refreshToken } = req.body;
        let payload;
        try {
            payload = (0, tokens_1.verifyRefreshToken)(refreshToken, jwtRefreshSecret);
        }
        catch {
            throw new errors_1.AppError(401, "Invalid or expired refresh token", "INVALID_REFRESH_TOKEN");
        }
        const stored = await prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: true },
        });
        if (!stored || stored.revokedAt) {
            throw new errors_1.AppError(401, "Refresh token revoked or not found", "INVALID_REFRESH_TOKEN");
        }
        // Revoke old token
        await prisma.refreshToken.update({
            where: { id: stored.id },
            data: { revokedAt: new Date() },
        });
        // Issue new tokens
        const newAccessToken = (0, tokens_1.signAccessToken)({ sub: stored.user.id, phone: stored.user.phone }, jwtSecret);
        const newRefreshTokenJwt = (0, tokens_1.signRefreshToken)({ sub: stored.user.id }, jwtRefreshSecret);
        await prisma.refreshToken.create({
            data: {
                token: newRefreshTokenJwt,
                userId: stored.user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });
        res.json({
            accessToken: newAccessToken,
            refreshToken: newRefreshTokenJwt,
        });
    }));
    // POST /auth/logout
    router.post("/logout", (0, validate_1.validate)(validation_1.refreshSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const { refreshToken } = req.body;
        const stored = await prisma.refreshToken.findUnique({
            where: { token: refreshToken },
        });
        if (stored && !stored.revokedAt) {
            await prisma.refreshToken.update({
                where: { id: stored.id },
                data: { revokedAt: new Date() },
            });
        }
        res.json({ message: "Logged out successfully" });
    }));
    return router;
}
//# sourceMappingURL=auth.js.map
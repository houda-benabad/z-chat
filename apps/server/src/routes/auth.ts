import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { getRedis } from "../lib/redis";
import { generateOtp, signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/tokens";
import { AppError } from "../lib/errors";
import { asyncHandler } from "../lib/asyncHandler";
import { validate } from "../middleware/validate";
import { otpRateLimit } from "../middleware/rateLimit";
import { sendOtpSchema, verifyOtpSchema, refreshSchema } from "../lib/validation";

const OTP_TTL = 5 * 60; // 5 minutes
const DEV_OTP_BYPASS = '000000'; // accepted in non-production only

export function createAuthRouter(prisma: PrismaClient, jwtSecret: string, jwtRefreshSecret: string): Router {
  const router = Router();

  // POST /auth/send-otp
  router.post(
    "/send-otp",
    validate(sendOtpSchema),
    otpRateLimit,
    asyncHandler(async (req, res) => {
      const { phone } = req.body;
      const redis = getRedis();
      const otp = generateOtp();

      await redis.set(`otp:${phone}`, otp, "EX", OTP_TTL);

      // Mock Twilio — log OTP instead of sending SMS
      console.log(`[Mock Twilio] OTP for ${phone}: ${otp}`);

      res.json({ message: "OTP sent successfully" });
    }),
  );

  // POST /auth/verify-otp
  router.post(
    "/verify-otp",
    validate(verifyOtpSchema),
    asyncHandler(async (req, res) => {
      const { phone, otp } = req.body;
      const redis = getRedis();

      const storedOtp = await redis.get(`otp:${phone}`);
      const isDevBypass = process.env.NODE_ENV !== 'production' && otp === DEV_OTP_BYPASS;
      if (!storedOtp || (storedOtp !== otp && !isDevBypass)) {
        throw new AppError(401, "Invalid or expired OTP", "INVALID_OTP");
      }

      await redis.del(`otp:${phone}`);

      // Create user if new
      let user = await prisma.user.findUnique({ where: { phone } });
      if (!user) {
        user = await prisma.user.create({ data: { phone } });
      }

      const accessToken = signAccessToken({ sub: user.id, phone: user.phone }, jwtSecret);
      const refreshTokenJwt = signRefreshToken({ sub: user.id }, jwtRefreshSecret);

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
    }),
  );

  // POST /auth/refresh
  router.post(
    "/refresh",
    validate(refreshSchema),
    asyncHandler(async (req, res) => {
      const { refreshToken } = req.body;

      let payload: { sub: string };
      try {
        payload = verifyRefreshToken(refreshToken, jwtRefreshSecret);
      } catch {
        throw new AppError(401, "Invalid or expired refresh token", "INVALID_REFRESH_TOKEN");
      }

      const stored = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!stored || stored.revokedAt) {
        throw new AppError(401, "Refresh token revoked or not found", "INVALID_REFRESH_TOKEN");
      }

      // Revoke old token
      await prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });

      // Issue new tokens
      const newAccessToken = signAccessToken(
        { sub: stored.user.id, phone: stored.user.phone },
        jwtSecret,
      );
      const newRefreshTokenJwt = signRefreshToken({ sub: stored.user.id }, jwtRefreshSecret);

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
    }),
  );

  // POST /auth/logout
  router.post(
    "/logout",
    validate(refreshSchema),
    asyncHandler(async (req, res) => {
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
    }),
  );

  return router;
}

import { RequestHandler } from "express";
import { getRedis } from "../lib/redis";
import { AppError } from "../lib/errors";
import { asyncHandler } from "../lib/asyncHandler";

const OTP_RATE_LIMIT = 5;
const OTP_RATE_WINDOW = 15 * 60; // 15 minutes in seconds

export const otpRateLimit: RequestHandler = asyncHandler(async (req, _res, next) => {
  const { phone } = req.body;
  if (!phone) {
    next();
    return;
  }

  const redis = getRedis();
  const key = `otp_rate:${phone}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, OTP_RATE_WINDOW);
  }

  if (count > OTP_RATE_LIMIT) {
    throw new AppError(429, "Too many OTP requests. Try again later.", "RATE_LIMITED");
  }

  next();
});

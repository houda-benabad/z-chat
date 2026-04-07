import { Request, RequestHandler } from "express";
import { getRedis } from "../database/redis";
import { AppError } from "../utils/errors";
import { asyncHandler } from "../utils/asyncHandler";

const OTP_RATE_LIMIT = 5;
const OTP_RATE_WINDOW = 15 * 60;

const VERIFY_RATE_LIMIT = 10;
const VERIFY_RATE_WINDOW = 15 * 60;

const GLOBAL_RATE_LIMIT = 100; // requests per IP per minute
const GLOBAL_RATE_WINDOW = 60;

/** Increment a Redis counter and return the new value. Throws AppError(429) if limit exceeded.
 *  If Redis is unavailable, throws AppError(429) to fail closed — never silently passes. */
async function checkLimit(key: string, limit: number, windowSecs: number, message: string): Promise<void> {
  const redis = getRedis();
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSecs);
    if (count > limit) throw new AppError(429, message, "RATE_LIMITED");
  } catch (err) {
    if (err instanceof AppError) throw err;
    // Redis unavailable — fail closed so limits cannot be bypassed
    throw new AppError(429, "Service temporarily unavailable, please retry shortly.", "RATE_LIMITED");
  }
}

function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]!.trim();
  return req.socket.remoteAddress ?? "unknown";
}

export const globalRateLimit: RequestHandler = asyncHandler(async (req, _res, next) => {
  const key = `rate:ip:${clientIp(req)}`;
  await checkLimit(key, GLOBAL_RATE_LIMIT, GLOBAL_RATE_WINDOW, "Too many requests. Please slow down.");
  next();
});

export const otpRateLimit: RequestHandler = asyncHandler(async (req, _res, next) => {
  const { phone } = req.body;
  if (!phone) { next(); return; }
  await checkLimit(`otp_rate:${phone}`, OTP_RATE_LIMIT, OTP_RATE_WINDOW, "Too many OTP requests. Try again later.");
  next();
});

export const verifyOtpRateLimit: RequestHandler = asyncHandler(async (req, _res, next) => {
  const { phone } = req.body;
  if (!phone) { next(); return; }
  await checkLimit(`otp_verify:${phone}`, VERIFY_RATE_LIMIT, VERIFY_RATE_WINDOW, "Too many verification attempts. Try again later.");
  next();
});

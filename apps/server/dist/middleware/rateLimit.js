"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpRateLimit = void 0;
const redis_1 = require("../lib/redis");
const errors_1 = require("../lib/errors");
const asyncHandler_1 = require("../lib/asyncHandler");
const OTP_RATE_LIMIT = 5;
const OTP_RATE_WINDOW = 15 * 60; // 15 minutes in seconds
exports.otpRateLimit = (0, asyncHandler_1.asyncHandler)(async (req, _res, next) => {
    const { phone } = req.body;
    if (!phone) {
        next();
        return;
    }
    const redis = (0, redis_1.getRedis)();
    const key = `otp_rate:${phone}`;
    const count = await redis.incr(key);
    if (count === 1) {
        await redis.expire(key, OTP_RATE_WINDOW);
    }
    if (count > OTP_RATE_LIMIT) {
        throw new errors_1.AppError(429, "Too many OTP requests. Try again later.", "RATE_LIMITED");
    }
    next();
});
//# sourceMappingURL=rateLimit.js.map
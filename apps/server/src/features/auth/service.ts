import Redis from "ioredis";
import { AuthRepository } from "./repository";
import { generateOtp, signAccessToken, signRefreshToken, verifyRefreshToken } from "../../shared/utils/tokens";
import { AppError } from "../../shared/utils/errors";
import { logger } from "../../shared/utils/logger";

const OTP_TTL = 5 * 60; // 5 minutes
const DEV_OTP_BYPASS = "000000"; // accepted in non-production only

export class AuthService {
  constructor(
    private repo: AuthRepository,
    private redis: Redis,
    private jwtSecret: string,
    private jwtRefreshSecret: string,
  ) {}

  async sendOtp(phone: string): Promise<void> {
    const otp = generateOtp();
    await this.redis.set(`otp:${phone}`, otp, "EX", OTP_TTL);
    // Mock Twilio — log OTP instead of sending SMS
    logger.info({ phone }, `[Mock Twilio] OTP: ${otp}`);
  }

  async verifyOtp(
    phone: string,
    otp: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; phone: string; name: string | null; about: string | null; avatar: string | null };
  }> {
    const storedOtp = await this.redis.get(`otp:${phone}`);
    const isDevBypass = process.env.NODE_ENV === "development" && otp === DEV_OTP_BYPASS;
    if (!storedOtp || (storedOtp !== otp && !isDevBypass)) {
      throw new AppError(401, "Invalid or expired OTP", "INVALID_OTP");
    }

    await this.redis.del(`otp:${phone}`);

    let user = await this.repo.findUserByPhone(phone);
    if (!user) {
      user = await this.repo.createUser(phone);
    }

    const accessToken = signAccessToken({ sub: user.id, phone: user.phone }, this.jwtSecret);
    const refreshTokenJwt = signRefreshToken({ sub: user.id }, this.jwtRefreshSecret);

    await this.repo.createRefreshToken({
      token: refreshTokenJwt,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return {
      accessToken,
      refreshToken: refreshTokenJwt,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        about: user.about,
        avatar: user.avatar,
      },
    };
  }

  async refreshTokens(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: { sub: string };
    try {
      payload = verifyRefreshToken(refreshToken, this.jwtRefreshSecret);
    } catch {
      throw new AppError(401, "Invalid or expired refresh token", "INVALID_REFRESH_TOKEN");
    }

    const stored = await this.repo.findRefreshToken(refreshToken);
    if (!stored || stored.revokedAt) {
      throw new AppError(401, "Refresh token revoked or not found", "INVALID_REFRESH_TOKEN");
    }

    // Revoke old token
    await this.repo.revokeRefreshToken(stored.id);

    // Issue new tokens
    const newAccessToken = signAccessToken(
      { sub: stored.user.id, phone: stored.user.phone },
      this.jwtSecret,
    );
    const newRefreshTokenJwt = signRefreshToken({ sub: stored.user.id }, this.jwtRefreshSecret);

    await this.repo.createRefreshToken({
      token: newRefreshTokenJwt,
      userId: stored.user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshTokenJwt };
  }

  async logout(refreshToken: string): Promise<void> {
    const stored = await this.repo.findRefreshTokenOnly(refreshToken);
    if (stored && !stored.revokedAt) {
      await this.repo.revokeRefreshToken(stored.id);
    }
  }
}

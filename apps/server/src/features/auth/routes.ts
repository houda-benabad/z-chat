import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import { AuthRepository } from "./repository";
import { AuthService, TwilioConfig } from "./service";
import { AuthController } from "./controller";
import { validate } from "../../shared/middleware/validate";
import { otpRateLimit, verifyOtpRateLimit } from "../../shared/middleware/rateLimit";
import { sendOtpSchema, verifyOtpSchema, refreshSchema } from "../../shared/utils/validation";

export function createAuthRouter(
  prisma: PrismaClient,
  redis: Redis,
  jwtSecret: string,
  jwtRefreshSecret: string,
  twilioConfig?: TwilioConfig,
): Router {
  const repo = new AuthRepository(prisma);
  const service = new AuthService(repo, redis, jwtSecret, jwtRefreshSecret, twilioConfig);
  const controller = new AuthController(service);
  const router = Router();

  router.post("/send-otp", validate(sendOtpSchema), otpRateLimit, controller.sendOtp);
  router.post("/verify-otp", validate(verifyOtpSchema), verifyOtpRateLimit, controller.verifyOtp);
  router.post("/refresh", validate(refreshSchema), controller.refresh);
  router.post("/logout", validate(refreshSchema), controller.logout);

  return router;
}

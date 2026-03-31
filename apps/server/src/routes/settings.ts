import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import { AppError } from "../lib/errors";

export function createSettingsRouter(prisma: PrismaClient, jwtSecret: string): Router {
  const router = Router();

  router.use(authMiddleware(jwtSecret));

  // DELETE /settings/account
  router.delete(
    "/account",
    asyncHandler(async (req: AuthRequest, res) => {
      const { confirmation } = req.body;

      if (confirmation !== "DELETE MY ACCOUNT") {
        throw new AppError(400, "Invalid confirmation", "INVALID_CONFIRMATION");
      }

      const userId = req.userId!;

      await prisma.$transaction(async (tx) => {
        // Delete messages sent by user (no cascade on sender relation)
        await tx.message.deleteMany({ where: { senderId: userId } });
        // Delete the user — cascade handles refreshTokens, chatParticipants, contacts
        await tx.user.delete({ where: { id: userId } });
      });

      res.json({ message: "Account deleted successfully" });
    }),
  );

  return router;
}

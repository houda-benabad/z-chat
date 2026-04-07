import { Response } from "express";
import { SettingsService } from "./service";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { AuthRequest } from "../../shared/middleware/auth";

export class SettingsController {
  constructor(private service: SettingsService) {}

  getSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
    const settings = await this.service.getSettings(req.userId!);
    res.json({ settings });
  });

  updatePrivacy = asyncHandler(async (req: AuthRequest, res: Response) => {
    const settings = await this.service.updatePrivacy(req.userId!, req.body);
    res.json({ settings });
  });

  updateNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
    const settings = await this.service.updateNotifications(req.userId!, req.body);
    res.json({ settings });
  });

  updateAppearance = asyncHandler(async (req: AuthRequest, res: Response) => {
    const settings = await this.service.updateAppearance(req.userId!, req.body);
    res.json({ settings });
  });

  updateStorage = asyncHandler(async (req: AuthRequest, res: Response) => {
    const settings = await this.service.updateStorage(req.userId!, req.body);
    res.json({ settings });
  });

  getBlockedUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
    const skip = Math.max(Number(req.query.skip) || 0, 0);
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const result = await this.service.getBlockedUsers(req.userId!, skip, limit);
    res.json(result);
  });

  blockUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId: targetId } = req.body;
    await this.service.blockUser(req.userId!, targetId);
    res.json({ message: "User blocked successfully" });
  });

  unblockUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.service.unblockUser(req.userId!, String(req.params.userId));
    res.json({ message: "User unblocked successfully" });
  });

  deleteAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { confirmation } = req.body;
    await this.service.deleteAccount(req.userId!, confirmation);
    res.json({ message: "Account deleted successfully" });
  });
}

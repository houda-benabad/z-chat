import { Response } from "express";
import { UserService } from "./service";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { AuthRequest } from "../../shared/middleware/auth";

export class UserController {
  constructor(private service: UserService) {}

  getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await this.service.getMe(req.userId!);
    res.json({ user });
  });

  getUserById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await this.service.getUserById(String(req.params.id), req.userId!);
    res.json({ user });
  });

  searchByPhone = asyncHandler(async (req: AuthRequest, res: Response) => {
    const phone = req.query.phone as string;
    const user = await this.service.searchByPhone(phone, req.userId!);
    res.json({ user });
  });

  updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await this.service.updateProfile(req.userId!, req.body);
    res.json({ user });
  });

  updatePublicKey = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await this.service.updatePublicKey(req.userId!, req.body.publicKey);
    res.json({ user });
  });

  savePushToken = asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.service.savePushToken(req.userId!, req.body.pushToken ?? null);
    res.json({ ok: true });
  });
}

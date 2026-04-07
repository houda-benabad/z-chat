import { Request, Response } from "express";
import { AuthService } from "./service";
import { asyncHandler } from "../../shared/utils/asyncHandler";

export class AuthController {
  constructor(private service: AuthService) {}

  sendOtp = asyncHandler(async (req: Request, res: Response) => {
    const { phone } = req.body;
    await this.service.sendOtp(phone);
    res.json({ message: "OTP sent successfully" });
  });

  verifyOtp = asyncHandler(async (req: Request, res: Response) => {
    const { phone, otp } = req.body;
    const result = await this.service.verifyOtp(phone, otp);
    res.json(result);
  });

  refresh = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const result = await this.service.refreshTokens(refreshToken);
    res.json(result);
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    await this.service.logout(refreshToken);
    res.json({ message: "Logged out successfully" });
  });
}

import { Response } from "express";
import { CallService } from "./service";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { AuthRequest } from "../../shared/middleware/auth";

export class CallController {
  constructor(private service: CallService) {}

  generateToken = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { channelName, uid } = req.body;
    const token = this.service.generateAgoraToken(channelName, uid);
    res.json({ token });
  });

  getCallHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
    const limit = Math.min(Number(req.query.limit) || 25, 50);
    const result = await this.service.getCallHistory(req.userId!, cursor, limit);
    res.json(result);
  });

  getCall = asyncHandler(async (req: AuthRequest, res: Response) => {
    const callId = String(req.params.id);
    const call = await this.service.getCallHistory(req.userId!);
    res.json(call);
  });
}

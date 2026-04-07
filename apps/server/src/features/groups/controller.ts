import { Response } from "express";
import { GroupService } from "./service";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { AuthRequest } from "../../shared/middleware/auth";

export class GroupController {
  constructor(private service: GroupService) {}

  createGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, description, avatar, memberIds } = req.body;
    const chat = await this.service.createGroup(req.userId!, { name, description, avatar, memberIds });
    res.status(201).json({ chat });
  });

  getGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
    const group = await this.service.getGroup(req.userId!, String(req.params.chatId));
    res.json({ group });
  });

  updateGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, description, avatar } = req.body;
    const chat = await this.service.updateGroup(req.userId!, String(req.params.chatId), {
      name,
      description,
      avatar,
    });
    res.json({ chat });
  });

  addMembers = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { memberIds } = req.body;
    const chat = await this.service.addMembers(req.userId!, String(req.params.chatId), memberIds);
    res.json({ chat });
  });

  removeMember = asyncHandler(async (req: AuthRequest, res: Response) => {
    const message = await this.service.removeMember(
      req.userId!,
      String(req.params.chatId),
      String(req.params.targetUserId),
    );
    res.json({ message });
  });

  distributeGroupKeys = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { keys, version } = req.body;
    const resultVersion = await this.service.distributeGroupKeys(
      req.userId!,
      String(req.params.chatId),
      keys,
      version,
    );
    res.json({ message: "Group keys distributed", version: resultVersion });
  });

  updateMemberRole = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { role } = req.body;
    const participant = await this.service.updateMemberRole(
      req.userId!,
      String(req.params.chatId),
      String(req.params.targetUserId),
      role,
    );
    res.json({ participant });
  });
}

import { Response } from "express";
import { AuthRequest } from "../../shared/middleware/auth";

export class UploadController {
  constructor(private uploadBaseUrl: string) {}

  uploadAvatar = (req: AuthRequest, res: Response): void => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    const url = `${this.uploadBaseUrl}/uploads/${req.file.filename}`;
    res.json({ url });
  };

  uploadMedia = (req: AuthRequest, res: Response): void => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    const url = `${this.uploadBaseUrl}/uploads/${req.file.filename}`;
    res.json({ url });
  };
}

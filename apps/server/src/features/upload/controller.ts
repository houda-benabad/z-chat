import { Response } from "express";
import { AuthRequest } from "../../shared/middleware/auth";

export class UploadController {
  constructor(private uploadBaseUrl: string) {}

  /**
   * Returns the base URL to use when constructing uploaded-file URLs.
   *
   * When UPLOAD_BASE_URL is left at the default "localhost" value (common in
   * development), mobile clients on the same LAN cannot reach that address —
   * they need the server's actual LAN IP.  We derive it from the incoming
   * request's Host header, which is already the IP/hostname the client used to
   * reach us.  When UPLOAD_BASE_URL is explicitly set to a real host/domain
   * (staging, production), we use it unchanged.
   */
  private resolveBaseUrl(req: AuthRequest): string {
    const isLocalhost =
      this.uploadBaseUrl.includes("localhost") ||
      this.uploadBaseUrl.includes("127.0.0.1");
    if (isLocalhost) {
      const host = req.get("host") ?? `localhost:3000`;
      return `${req.protocol}://${host}`;
    }
    return this.uploadBaseUrl;
  }

  uploadAvatar = (req: AuthRequest, res: Response): void => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    const url = `${this.resolveBaseUrl(req)}/uploads/${req.file.filename}`;
    res.json({ url });
  };

  uploadMedia = (req: AuthRequest, res: Response): void => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    const url = `${this.resolveBaseUrl(req)}/uploads/${req.file.filename}`;
    res.json({ url });
  };
}

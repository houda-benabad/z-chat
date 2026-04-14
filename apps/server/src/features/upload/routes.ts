import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import { randomUUID } from "crypto";
import { authMiddleware } from "../../shared/middleware/auth";
import { UploadController } from "./controller";
import { detectMimeCategory } from "../../shared/utils/magicBytes";

const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png":  ".png",
  "image/gif":  ".gif",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "video/mp4":        ".mp4",
  "video/quicktime":  ".mov",
  "video/webm":       ".webm",
  "video/x-matroska": ".mkv",
  "audio/mpeg": ".mp3",
  "audio/mp4":  ".m4a",
  "audio/m4a":  ".m4a",
  "audio/aac":  ".aac",
  "audio/ogg":  ".ogg",
  "audio/webm": ".webm",
  "audio/wav":  ".wav",
  "application/pdf":  ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

function extFromMime(mime: string): string {
  return MIME_EXT[mime.toLowerCase()] ?? ".bin";
}

const storage = multer.diskStorage({
  destination: path.join(process.cwd(), "public/uploads"),
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${extFromMime(file.mimetype)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

const mediaUpload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/") ||
      file.mimetype.startsWith("audio/") ||
      file.mimetype.startsWith("application/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only image, video, audio, and document files are allowed"));
    }
  },
});

/** Delete the file multer saved, then respond with 400 */
async function rejectFile(req: Request, res: Response, next: NextFunction, message: string) {
  if (req.file?.path) {
    await fs.unlink(req.file.path).catch(() => {});
  }
  res.status(400).json({ error: message });
}

/** Middleware: verify the file's magic bytes match the expected MIME category */
function validateMagicBytes(allowedPrefixes: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) return next();
    const detected = await detectMimeCategory(req.file.path);
    if (!detected || !allowedPrefixes.some((p) => detected === p)) {
      await rejectFile(req, res, next, "File type does not match its contents");
      return;
    }
    next();
  };
}

export function createUploadRouter(jwtSecret: string, uploadBaseUrl: string): Router {
  const controller = new UploadController(uploadBaseUrl);
  const router = Router();

  router.use(authMiddleware(jwtSecret));

  router.post(
    "/avatar",
    upload.single("avatar"),
    validateMagicBytes(["image/"]),
    controller.uploadAvatar,
  );
  router.post(
    "/media",
    mediaUpload.single("media"),
    validateMagicBytes(["image/", "video/", "audio/", "application/"]),
    controller.uploadMedia,
  );

  return router;
}

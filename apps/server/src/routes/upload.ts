import { Router } from "express";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import { AuthRequest, authMiddleware } from "../middleware/auth";

const storage = multer.diskStorage({
  destination: path.join(process.cwd(), "public/uploads"),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${randomUUID()}${ext}`);
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

export function createUploadRouter(jwtSecret: string): Router {
  const router = Router();
  router.use(authMiddleware(jwtSecret));

  router.post("/avatar", upload.single("avatar"), (req: AuthRequest, res) => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    const host = req.headers.host ?? "localhost:3000";
    const protocol = req.headers["x-forwarded-proto"] ?? "http";
    const url = `${protocol}://${host}/uploads/${req.file.filename}`;
    res.json({ url });
  });

  router.post("/media", upload.single("media"), (req: AuthRequest, res) => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    const host = req.headers.host ?? "localhost:3000";
    const protocol = req.headers["x-forwarded-proto"] ?? "http";
    const url = `${protocol}://${host}/uploads/${req.file.filename}`;
    res.json({ url });
  });

  return router;
}

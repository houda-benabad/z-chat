import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/tokens";
import { AppError } from "../lib/errors";

export interface AuthRequest extends Request {
  userId?: string;
  userPhone?: string;
}

export function authMiddleware(jwtSecret: string) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new AppError(401, "Missing or invalid authorization header", "UNAUTHORIZED");
    }

    const token = header.slice(7);
    try {
      const payload = verifyAccessToken(token, jwtSecret);
      req.userId = payload.sub;
      req.userPhone = payload.phone;
      next();
    } catch {
      throw new AppError(401, "Invalid or expired token", "TOKEN_EXPIRED");
    }
  };
}

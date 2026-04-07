import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/tokens";
import { AppError } from "../utils/errors";

export interface AuthRequest extends Request {
  userId?: string;
  userPhone?: string;
}

export function authMiddleware(jwtSecret: string) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return next(new AppError(401, "Missing or invalid authorization header", "UNAUTHORIZED"));
    }

    const token = header.slice(7);
    try {
      const payload = verifyAccessToken(token, jwtSecret);
      req.userId = payload.sub;
      req.userPhone = payload.phone;
      next();
    } catch {
      next(new AppError(401, "Invalid or expired token", "TOKEN_EXPIRED"));
    }
  };
}

import { Request, Response, NextFunction } from "express";
import { AppError, formatError } from "../lib/errors";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(formatError(err));
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({
    error: {
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    },
  });
}

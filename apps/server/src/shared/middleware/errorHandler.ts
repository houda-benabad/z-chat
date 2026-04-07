import { Request, Response, NextFunction } from "express";
import { AppError, formatError } from "../utils/errors";
import { logger } from "../utils/logger";

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

  logger.error({ err, requestId: _req.headers["x-request-id"] }, "Unhandled error");
  res.status(500).json({
    error: {
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    },
  });
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export interface ErrorResponse {
  error: {
    message: string;
    code?: string;
  };
}

export function formatError(err: AppError): ErrorResponse {
  return {
    error: {
      message: err.message,
      code: err.code,
    },
  };
}

export declare class AppError extends Error {
    statusCode: number;
    code?: string | undefined;
    constructor(statusCode: number, message: string, code?: string | undefined);
}
export interface ErrorResponse {
    error: {
        message: string;
        code?: string;
    };
}
export declare function formatError(err: AppError): ErrorResponse;
//# sourceMappingURL=errors.d.ts.map
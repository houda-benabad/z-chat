"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.formatError = formatError;
class AppError extends Error {
    statusCode;
    code;
    constructor(statusCode, message, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = "AppError";
    }
}
exports.AppError = AppError;
function formatError(err) {
    return {
        error: {
            message: err.message,
            code: err.code,
        },
    };
}
//# sourceMappingURL=errors.js.map
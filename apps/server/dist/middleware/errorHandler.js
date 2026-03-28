"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const errors_1 = require("../lib/errors");
function errorHandler(err, _req, res, _next) {
    if (err instanceof errors_1.AppError) {
        res.status(err.statusCode).json((0, errors_1.formatError)(err));
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
//# sourceMappingURL=errorHandler.js.map
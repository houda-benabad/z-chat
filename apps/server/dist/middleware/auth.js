"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const tokens_1 = require("../lib/tokens");
const errors_1 = require("../lib/errors");
function authMiddleware(jwtSecret) {
    return (req, _res, next) => {
        const header = req.headers.authorization;
        if (!header?.startsWith("Bearer ")) {
            throw new errors_1.AppError(401, "Missing or invalid authorization header", "UNAUTHORIZED");
        }
        const token = header.slice(7);
        try {
            const payload = (0, tokens_1.verifyAccessToken)(token, jwtSecret);
            req.userId = payload.sub;
            req.userPhone = payload.phone;
            next();
        }
        catch {
            throw new errors_1.AppError(401, "Invalid or expired token", "TOKEN_EXPIRED");
        }
    };
}
//# sourceMappingURL=auth.js.map
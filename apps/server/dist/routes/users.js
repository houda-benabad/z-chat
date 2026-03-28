"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserRouter = createUserRouter;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const asyncHandler_1 = require("../lib/asyncHandler");
const validation_1 = require("../lib/validation");
const errors_1 = require("../lib/errors");
function createUserRouter(prisma, jwtSecret) {
    const router = (0, express_1.Router)();
    router.use((0, auth_1.authMiddleware)(jwtSecret));
    // GET /users/me
    router.get("/me", (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: { id: true, phone: true, name: true, about: true, avatar: true, createdAt: true },
        });
        if (!user) {
            throw new errors_1.AppError(404, "User not found", "USER_NOT_FOUND");
        }
        res.json({ user });
    }));
    // PATCH /users/me
    router.patch("/me", (0, validate_1.validate)(validation_1.updateProfileSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const user = await prisma.user.update({
            where: { id: req.userId },
            data: req.body,
            select: { id: true, phone: true, name: true, about: true, avatar: true, createdAt: true },
        });
        res.json({ user });
    }));
    return router;
}
//# sourceMappingURL=users.js.map
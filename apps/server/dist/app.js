"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = require("./routes/auth");
const users_1 = require("./routes/users");
const errorHandler_1 = require("./middleware/errorHandler");
function createApp(prisma, jwtSecret, jwtRefreshSecret) {
    const app = (0, express_1.default)();
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    app.get("/health", (_req, res) => {
        res.json({ status: "ok" });
    });
    app.use("/auth", (0, auth_1.createAuthRouter)(prisma, jwtSecret, jwtRefreshSecret));
    app.use("/users", (0, users_1.createUserRouter)(prisma, jwtSecret));
    app.use(errorHandler_1.errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map
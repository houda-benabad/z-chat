"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("./lib/env");
const prisma_1 = require("./lib/prisma");
const redis_1 = require("./lib/redis");
const app_1 = require("./app");
async function main() {
    const env = (0, env_1.loadEnv)();
    const app = (0, app_1.createApp)(prisma_1.prisma, env.JWT_SECRET, env.JWT_REFRESH_SECRET);
    // Verify connections
    await prisma_1.prisma.$connect();
    (0, redis_1.getRedis)();
    app.listen(env.PORT, () => {
        console.log(`Server running on port ${env.PORT}`);
    });
}
main().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map
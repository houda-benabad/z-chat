import http from "http";
import { loadEnv } from "./lib/env";
import { prisma } from "./lib/prisma";
import { getRedis } from "./lib/redis";
import { createApp } from "./app";
import { createSocketServer } from "./socket";

async function main() {
  const env = loadEnv();
  const app = createApp(prisma, env.JWT_SECRET, env.JWT_REFRESH_SECRET);

  // Verify connections
  await prisma.$connect();
  getRedis();

  const httpServer = http.createServer(app);
  createSocketServer(httpServer, prisma, env.JWT_SECRET);

  httpServer.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });

  const shutdown = async () => {
    httpServer.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

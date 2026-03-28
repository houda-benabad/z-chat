import { loadEnv } from "./lib/env";
import { prisma } from "./lib/prisma";
import { getRedis } from "./lib/redis";
import { createApp } from "./app";

async function main() {
  const env = loadEnv();
  const app = createApp(prisma, env.JWT_SECRET, env.JWT_REFRESH_SECRET);

  // Verify connections
  await prisma.$connect();
  getRedis();

  app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

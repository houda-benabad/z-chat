import Redis from "ioredis";

let redis: Redis;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
  }
  return redis;
}

export function setRedisInstance(instance: Redis): void {
  redis = instance;
}

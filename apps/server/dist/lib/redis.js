"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedis = getRedis;
exports.setRedisInstance = setRedisInstance;
const ioredis_1 = __importDefault(require("ioredis"));
let redis;
function getRedis() {
    if (!redis) {
        redis = new ioredis_1.default(process.env.REDIS_URL || "redis://localhost:6379");
    }
    return redis;
}
function setRedisInstance(instance) {
    redis = instance;
}
//# sourceMappingURL=redis.js.map
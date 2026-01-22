import IORedis from "ioredis";
import Redis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

let redisIOClient: IORedis | null = null;
let redisClient: IORedis | null = null;

export function redisIOConnection(): IORedis {
  if (!redisIOClient) {
    if (!process.env.REDIS_URL) {
      throw new Error("REDIS_URL is not defined in environment variables");
    }
    redisIOClient = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
  }
  return redisIOClient;
}

export function redisConnection(): Redis {
  if (!redisClient) {
    if (!process.env.REDIS_URL) {
      throw new Error("REDIS_URL is not defined in environment variables");
    }
    redisClient = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
  }
  return redisClient;
}

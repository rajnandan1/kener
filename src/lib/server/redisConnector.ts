import IORedis from "ioredis";
import Redis from "ioredis";
import type { RedisOptions } from "ioredis";
import dotenv from "dotenv";
dotenv.config();

let redisIOClient: IORedis | null = null;
let redisClient: IORedis | null = null;

function shouldReconnectAfterRedisError(message: string): boolean {
  const m = message.toUpperCase();
  // Failover: writes hit a replica until the client points at the new primary.
  if (m.includes("READONLY")) return true;
  // RDB/AOF reload after pod restart — commands fail until loading finishes.
  if (m.includes("LOADING")) return true;
  // Replication: primary unavailable during StatefulSet rollout.
  if (m.includes("MASTERDOWN")) return true;
  return false;
}

const redisClientOptions: RedisOptions = {
  maxRetriesPerRequest: null,
  // Detect dead peers during long K8s / network stalls (default ioredis keepAlive is off).
  keepAlive: 30000,
  // Allow long RDB reloads after a StatefulSet restart before giving up on "ready".
  maxLoadingRetryTime: 120_000,
  reconnectOnError: (error: Error) => {
    const message = error?.message ?? "";
    if (shouldReconnectAfterRedisError(message)) {
      // Reconnect and retry the failed command once the connection is healthy again.
      return 2;
    }
    return false;
  },
};

export function redisIOConnection(): IORedis {
  if (!redisIOClient) {
    if (!process.env.REDIS_URL) {
      throw new Error("REDIS_URL is not defined in environment variables");
    }
    redisIOClient = new IORedis(process.env.REDIS_URL, redisClientOptions);
  }
  return redisIOClient;
}

export function redisConnection(): Redis {
  if (!redisClient) {
    if (!process.env.REDIS_URL) {
      throw new Error("REDIS_URL is not defined in environment variables");
    }
    redisClient = new Redis(process.env.REDIS_URL, redisClientOptions);
  }
  return redisClient;
}

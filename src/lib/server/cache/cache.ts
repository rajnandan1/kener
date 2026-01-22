import { redisIOConnection } from "../redisConnector.js";

const prefix = "kener:cache:";
const defaultTtlSeconds = 300;

const getCacheKey = (key: string) => `${prefix}${key}`;

export async function setCache<T>(key: string, value: T | null | undefined, ttlSeconds?: number): Promise<void> {
  const redis = redisIOConnection();
  const payload = JSON.stringify(value ?? null);

  const ttl = typeof ttlSeconds === "number" && ttlSeconds > 0 ? ttlSeconds : defaultTtlSeconds;
  await redis.set(getCacheKey(key), payload, "EX", ttl);
}

export async function getCache<T>(
  key: string,
  fetcher?: () => Promise<T | null | undefined> | T | null | undefined,
  ttlSeconds?: number,
): Promise<T | null> {
  const redis = redisIOConnection();
  const raw = await redis.get(getCacheKey(key));
  if (raw !== null) {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  if (!fetcher) return null;

  const value = await fetcher();
  await setCache<T>(key, value, ttlSeconds);
  return value ?? null;
}

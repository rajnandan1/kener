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

export async function deleteCache(key: string): Promise<void> {
  const redis = redisIOConnection();
  await redis.del(getCacheKey(key));
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

function parseCacheValue<T>(raw: string | null): T | null {
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Batch Redis GET. Missing or invalid entries are null, matching getCache. */
export async function getCacheMany<T>(keys: string[]): Promise<Array<T | null>> {
  if (keys.length === 0) return [];
  const redis = redisIOConnection();
  const raw = await redis.mget(...keys.map(getCacheKey));
  return raw.map((item: string | null) => parseCacheValue<T>(item));
}

/** Batch Redis SET with the same TTL for every key. */
export async function setCacheMany<T>(
  entries: Array<{ key: string; value: T | null | undefined }>,
  ttlSeconds?: number,
): Promise<void> {
  if (entries.length === 0) return;
  const redis = redisIOConnection();
  const ttl = typeof ttlSeconds === "number" && ttlSeconds > 0 ? ttlSeconds : defaultTtlSeconds;
  const pipeline = redis.pipeline();
  for (const entry of entries) {
    pipeline.set(getCacheKey(entry.key), JSON.stringify(entry.value ?? null), "EX", ttl);
  }
  await pipeline.exec();
}

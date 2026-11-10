import { isRedisConfigured, redisIOConnection } from "../redisConnector.js";

const prefix = "kener:cache:";
const defaultTtlSeconds = 300;
const memoryLimit = 5000;
const memoryCache = ((
  globalThis as typeof globalThis & {
    __kenerMemoryCache?: Map<string, { payload: string; expiresAt: number }>;
  }
).__kenerMemoryCache ??= new Map());

const getCacheKey = (key: string) => `${prefix}${key}`;

export async function setCache<T>(key: string, value: T | null | undefined, ttlSeconds?: number): Promise<void> {
  const payload = JSON.stringify(value ?? null);
  const ttl = typeof ttlSeconds === "number" && ttlSeconds > 0 ? ttlSeconds : defaultTtlSeconds;

  if (!isRedisConfigured()) {
    const cacheKey = getCacheKey(key);
    memoryCache.delete(cacheKey);
    memoryCache.set(cacheKey, { payload, expiresAt: Date.now() + ttl * 1000 });
    if (memoryCache.size > memoryLimit) {
      memoryCache.delete(memoryCache.keys().next().value!);
    }
    return;
  }

  const redis = redisIOConnection();
  await redis.set(getCacheKey(key), payload, "EX", ttl);
}

export async function deleteCache(key: string): Promise<void> {
  if (!isRedisConfigured()) {
    memoryCache.delete(getCacheKey(key));
    return;
  }

  const redis = redisIOConnection();
  await redis.del(getCacheKey(key));
}

/** Reads through the selected cache backend, optionally filling it. */
export async function getCache<T>(
  key: string,
  fetcher?: () => Promise<T | null | undefined> | T | null | undefined,
  ttlSeconds?: number,
): Promise<T | null> {
  if (!isRedisConfigured()) {
    const cacheKey = getCacheKey(key);
    const entry = memoryCache.get(cacheKey);
    if (entry && entry.expiresAt > Date.now()) {
      return JSON.parse(entry.payload) as T;
    }
    memoryCache.delete(cacheKey);
    if (!fetcher) return null;

    const value = await fetcher();
    await setCache<T>(key, value, ttlSeconds);
    return value ?? null;
  }

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

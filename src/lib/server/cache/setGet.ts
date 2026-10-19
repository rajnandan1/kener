import type { MonitoringData } from "../types/db.js";
import { setCache, getCache, getCacheMany, deleteCache } from "./cache.js";
import { redisIOConnection } from "../redisConnector.js";

const LAST_STATUS_TTL_SECONDS = 86400;
const cachePrefix = "kener:cache:";

/**
 * Atomically SET last_status only when the incoming sample is not older than the
 * cached one. Concurrent response workers can finish out of order; without this,
 * an older check would overwrite a newer dashboard status.
 */
const SET_LAST_STATUS_IF_NEWER_LUA = `
local raw = redis.call('GET', KEYS[1])
if raw then
  local ok, existing = pcall(cjson.decode, raw)
  if ok and type(existing) == 'table' and existing['timestamp'] ~= nil then
    if tonumber(existing['timestamp']) > tonumber(ARGV[2]) then
      return 0
    end
  end
end
redis.call('SET', KEYS[1], ARGV[1], 'EX', tonumber(ARGV[3]))
return 1
`;

/** Persist the latest monitoring sample for a tag (includes SSL-only Redis fields). */
export async function SetLastMonitoringValue(tag: string, value: MonitoringData): Promise<void> {
  const redis = redisIOConnection();
  const key = `${cachePrefix}${tag}:last_status`;
  const payload = JSON.stringify(value);
  await redis.eval(
    SET_LAST_STATUS_IF_NEWER_LUA,
    1,
    key,
    payload,
    String(value.timestamp ?? 0),
    String(LAST_STATUS_TTL_SECONDS),
  );
}

/** Read the cached latest sample for a tag; optional fetcher seeds an empty key. */
export async function GetLastMonitoringValue(
  tag: string,
  fetcher?: () => Promise<MonitoringData | undefined | null> | MonitoringData | undefined | null,
): Promise<MonitoringData | null> {
  return await getCache<MonitoringData>(tag + ":last_status", fetcher, LAST_STATUS_TTL_SECONDS);
}

/** Batch-read last_status for many tags (null entries are cache misses). */
export async function GetLastMonitoringValues(tags: string[]): Promise<Array<MonitoringData | null>> {
  if (tags.length === 0) return [];
  return await getCacheMany<MonitoringData>(tags.map((tag) => tag + ":last_status"));
}

/** Cache the last heartbeat timestamp for a push monitor. */
export async function SetLastHeartbeat(tag: string, timestamp: number): Promise<void> {
  await setCache<{ timestamp: number }>("last_heartbeat:" + tag, { timestamp }, 45 * 86400); //set ttl to 45 days
}

/** Read the cached last heartbeat timestamp for a push monitor. */
export async function GetLastHeartbeat(tag: string): Promise<{ timestamp: number } | null> {
  return await getCache<{ timestamp: number }>("last_heartbeat:" + tag, undefined, 45 * 86400);
}

/** Drop last_status and heartbeat keys for a monitor tag. */
export async function DeleteMonitorCaches(tag: string): Promise<void> {
  await deleteCache(tag + ":last_status");
  await deleteCache("last_heartbeat:" + tag);
}

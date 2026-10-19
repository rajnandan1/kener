import type { MonitoringData } from "../types/db.js";
import { setCache, getCache, getCacheMany, deleteCache } from "./cache.js";
import { redisIOConnection } from "../redisConnector.js";

const LAST_STATUS_TTL_SECONDS = 86400;
const cachePrefix = "kener:cache:";

export type SetLastMonitoringValueOptions = {
  /**
   * Allow writing an older sample when the cache still holds this exact timestamp
   * (the row an admin intended to replace). A concurrent newer check that changed
   * the cache after the refresh started is not overwritten.
   */
  replaceCachedTimestamp?: number | null;
};

/**
 * Atomically SET last_status when:
 * - there is no cached value, or
 * - the incoming timestamp is >= the cached one, or
 * - the cached timestamp equals ARGV[4] (intentional admin replace of that sample).
 *
 * ARGV: [1]=payload JSON, [2]=new timestamp, [3]=TTL seconds, [4]=expected cached ts or "".
 */
const SET_LAST_STATUS_ORDERED_LUA = `
local raw = redis.call('GET', KEYS[1])
local new_ts = tonumber(ARGV[2])
local expected = ARGV[4]
if raw then
  local ok, existing = pcall(cjson.decode, raw)
  if ok and type(existing) == 'table' and existing['timestamp'] ~= nil then
    local cur = tonumber(existing['timestamp'])
    if cur > new_ts then
      if expected == '' or cur ~= tonumber(expected) then
        return 0
      end
    end
  end
end
redis.call('SET', KEYS[1], ARGV[1], 'EX', tonumber(ARGV[3]))
return 1
`;

function lastStatusRedisKey(tag: string): string {
  return `${cachePrefix}${tag}:last_status`;
}

/** Persist the latest monitoring sample for a tag (includes SSL-only Redis fields). */
export async function SetLastMonitoringValue(
  tag: string,
  value: MonitoringData,
  options?: SetLastMonitoringValueOptions,
): Promise<void> {
  const redis = redisIOConnection();
  const key = lastStatusRedisKey(tag);
  const payload = JSON.stringify(value);
  const expected =
    options?.replaceCachedTimestamp != null ? String(options.replaceCachedTimestamp) : "";
  await redis.eval(
    SET_LAST_STATUS_ORDERED_LUA,
    1,
    key,
    payload,
    String(value.timestamp ?? 0),
    String(LAST_STATUS_TTL_SECONDS),
    expected,
  );
}

/**
 * Read the cached latest sample for a tag.
 * On miss, optional `fetcher` seeds via the timestamp-ordered write; the value
 * retained in Redis is returned (a concurrent newer write wins).
 */
export async function GetLastMonitoringValue(
  tag: string,
  fetcher?: () => Promise<MonitoringData | undefined | null> | MonitoringData | undefined | null,
): Promise<MonitoringData | null> {
  const redis = redisIOConnection();
  const key = lastStatusRedisKey(tag);
  const raw = await redis.get(key);
  if (raw !== null) {
    try {
      return JSON.parse(raw) as MonitoringData;
    } catch {
      // Invalid payload — fall through to fetcher / null
    }
  }

  if (!fetcher) return null;

  const value = await fetcher();
  if (!value) return null;

  await SetLastMonitoringValue(tag, value);

  const retained = await redis.get(key);
  if (retained !== null) {
    try {
      return JSON.parse(retained) as MonitoringData;
    } catch {
      return value;
    }
  }
  return value;
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

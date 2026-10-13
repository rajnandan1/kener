import type { MonitoringData } from "../types/db.js";
import { setCache, getCache, getCacheMany, deleteCache } from "./cache.js";

/** Persist the latest monitoring sample for a tag (includes SSL-only Redis fields). */
export async function SetLastMonitoringValue(tag: string, value: MonitoringData): Promise<void> {
  await setCache<MonitoringData>(tag + ":last_status", value, 86400); //set ttl to 1 day
}

/** Read the cached latest sample for a tag; optional fetcher seeds an empty key. */
export async function GetLastMonitoringValue(
  tag: string,
  fetcher?: () => Promise<MonitoringData | undefined | null> | MonitoringData | undefined | null,
): Promise<MonitoringData | null> {
  return await getCache<MonitoringData>(tag + ":last_status", fetcher, 86400);
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

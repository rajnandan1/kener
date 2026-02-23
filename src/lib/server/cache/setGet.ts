import type { MonitoringData } from "../types/db.js";
import { setCache, getCache } from "./cache.js";
export async function SetLastMonitoringValue(tag: string, value: MonitoringData): Promise<void> {
  await setCache<MonitoringData>(tag + ":last_status", value, 86400); //set ttl to 1 day
}

export async function GetLastMonitoringValue(
  tag: string,
  fetcher?: () => Promise<MonitoringData | undefined | null> | MonitoringData | undefined | null,
): Promise<MonitoringData | null> {
  return await getCache<MonitoringData>(tag + ":last_status", fetcher, 86400);
}

//function to set heartbeat value in cache
export async function SetLastHeartbeat(tag: string, timestamp: number): Promise<void> {
  await setCache<{ timestamp: number }>("last_heartbeat:" + tag, { timestamp }, 45 * 86400); //set ttl to 45 days
}

//function to get heartbeat value from cache
export async function GetLastHeartbeat(tag: string): Promise<{ timestamp: number } | null> {
  return await getCache<{ timestamp: number }>("last_heartbeat:" + tag, undefined, 45 * 86400);
}

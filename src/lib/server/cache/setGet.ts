import type { MonitoringData } from "../types/db.js";
import { setCache, getCache } from "./cache.js";
export async function SetLastMonitoringValue(key: string, value: MonitoringData): Promise<void> {
  await setCache<MonitoringData>(key, value, 86400); //set ttl to 1 day
}

export async function GetLastMonitoringValue(
  key: string,
  fetcher?: () => Promise<MonitoringData | undefined | null> | MonitoringData | undefined | null,
): Promise<MonitoringData | null> {
  return await getCache<MonitoringData>(key, fetcher, 86400);
}

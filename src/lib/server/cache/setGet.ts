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

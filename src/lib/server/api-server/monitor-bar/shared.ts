import db from "$lib/server/db/db";
import GC, { type StatusType } from "$lib/global-constants";
import type { MonitorRecord, MonitorValueDisplay, TimestampStatusCount } from "$lib/server/types/db";
import { UptimeCalculator } from "$lib/server/tool";
import type { MonitorBarResponse } from "./get";

interface ParsedMonitorSettings {
  uptime_formula_numerator?: string;
  uptime_formula_denominator?: string;
  // Mirrors the persisted key inside monitor_settings_json (snake_case by storage convention).
  value_display?: MonitorValueDisplay;
}

const parseMonitorSettings = (value: string | null): ParsedMonitorSettings => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as ParsedMonitorSettings;
    return parsed || {};
  } catch {
    return {};
  }
};

/** Fills gaps in `rawUptimeData` with zeroed entries so every day in `[startTime, startTime + days)` is present. */
const fillMissingUptimeData = (
  rawUptimeData: TimestampStatusCount[],
  startTime: number,
  days: number,
): TimestampStatusCount[] => {
  const uptimeData: TimestampStatusCount[] = [];
  const uptimeDataMap = new Map(rawUptimeData.map((d) => [d.ts, d]));

  for (let i = 0; i < days; i++) {
    const ts = startTime + i * 86400;
    const data = uptimeDataMap.get(ts);
    if (data) {
      uptimeData.push(data);
    } else {
      uptimeData.push({
        ts,
        countOfUp: 0,
        countOfDown: 0,
        countOfDegraded: 0,
        countOfMaintenance: 0,
        avgLatency: 0,
        maxLatency: 0,
        minLatency: 0,
        latencyCount: 0,
      });
    }
  }

  return uptimeData;
};

export const buildMonitorBarResponse = async (
  monitor: MonitorRecord,
  days: number,
  endOfDayTodayAtTz: number,
  latestStatus?: StatusType,
): Promise<MonitorBarResponse> => {
  const startTime = endOfDayTodayAtTz - days * 24 * 60 * 60;
  const [rawUptimeData, latestData] = await Promise.all([
    db.getStatusCountsByInterval(monitor.tag, startTime, 86400, days),
    latestStatus ? Promise.resolve(null) : db.getLatestMonitoringData(monitor.tag),
  ]);

  return buildMonitorBarResponseFromRawData(
    monitor,
    rawUptimeData,
    days,
    endOfDayTodayAtTz,
    latestStatus || (latestData?.status as StatusType) || GC.NO_DATA,
  );
};

/** Synchronous core of `buildMonitorBarResponse`: assembles a `MonitorBarResponse` from already-fetched raw uptime data. */
export const buildMonitorBarResponseFromRawData = (
  monitor: MonitorRecord,
  rawUptimeData: TimestampStatusCount[],
  days: number,
  endOfDayTodayAtTz: number,
  latestStatus?: StatusType,
): MonitorBarResponse => {
  const startTime = endOfDayTodayAtTz - days * 24 * 60 * 60;
  const monitorSettings = parseMonitorSettings(monitor.monitor_settings_json);
  const uptimeCalculationResult = UptimeCalculator(
    rawUptimeData,
    monitorSettings.uptime_formula_numerator,
    monitorSettings.uptime_formula_denominator,
    monitorSettings.value_display,
  );

  return {
    name: monitor.name,
    description: monitor.description || "",
    image: monitor.image || null,
    currentStatus: latestStatus || GC.NO_DATA,
    uptime: uptimeCalculationResult.uptime,
    uptimeData: fillMissingUptimeData(rawUptimeData, startTime, days),
    fromTimeStamp: startTime,
    toTimeStamp: endOfDayTodayAtTz - 1,
    avgLatency: uptimeCalculationResult.avgLatency,
    maxLatency: uptimeCalculationResult.maxLatency,
    minLatency: uptimeCalculationResult.minLatency,
    valueDisplay: monitorSettings.value_display ?? null,
  };
};

import db from "$lib/server/db/db";
import GC from "$lib/global-constants";
import type { StatusType } from "$lib/types/status";
import type { MonitorRecord, MonitoringData, TimestampStatusCount } from "$lib/server/types/db";
import { UptimeCalculator } from "$lib/server/tool";
import type { MonitorBarResponse } from "./get";
import { ResolveSslExpiresAtMs } from "$lib/clientTools";
import { AttachSslCacheFields } from "$lib/server/controllers/monitorsController";

interface ParsedMonitorSettings {
  uptime_formula_numerator?: string;
  uptime_formula_denominator?: string;
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
  const isSsl = monitor.monitor_type === "SSL";
  const [rawUptimeData, latestData] = await Promise.all([
    db.getStatusCountsByInterval(monitor.tag, startTime, 86400, days),
    latestStatus && !isSsl ? Promise.resolve(null) : db.getLatestMonitoringData(monitor.tag),
  ]);
  const latest = isSsl ? await AttachSslCacheFields(latestData) : latestData;

  return buildMonitorBarResponseFromRawData(
    monitor,
    rawUptimeData,
    days,
    endOfDayTodayAtTz,
    latestStatus || (latest?.status as StatusType) || GC.NO_DATA,
    latest,
  );
};

export const buildMonitorBarResponseFromRawData = (
  monitor: MonitorRecord,
  rawUptimeData: TimestampStatusCount[],
  days: number,
  endOfDayTodayAtTz: number,
  latestStatus?: StatusType,
  latestData?: MonitoringData | null,
): MonitorBarResponse => {
  const startTime = endOfDayTodayAtTz - days * 24 * 60 * 60;
  const isSsl = monitor.monitor_type === "SSL";
  const monitorSettings = parseMonitorSettings(monitor.monitor_settings_json);
  const uptimeCalculationResult = UptimeCalculator(
    rawUptimeData,
    monitorSettings.uptime_formula_numerator,
    monitorSettings.uptime_formula_denominator,
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
    monitorType: monitor.monitor_type,
    sslExpiresAt: isSsl ? ResolveSslExpiresAtMs(latestData) : null,
    sslTrusted: isSsl && latestData?.expiry_at ? latestData.type !== GC.ERROR : null,
    issuerCn: isSsl ? (latestData?.issuer_cn ?? null) : null,
    issuerO: isSsl ? (latestData?.issuer_o ?? null) : null,
  };
};

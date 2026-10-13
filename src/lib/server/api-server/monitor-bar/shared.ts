import db from "$lib/server/db/db";
import GC from "$lib/global-constants";
import type { StatusType } from "$lib/types/status";
import type { MonitorRecord, TimestampStatusCount, MonitoringData } from "$lib/server/types/db";
import { UptimeCalculator } from "$lib/server/tool";
import type { MonitorBarResponse } from "./get";
import { ResolveSslExpiresAtMs, FormatSslRemaining, ParseSslIssuerFromMessage } from "$lib/clientTools";
import { GetLastMonitoringValue } from "$lib/server/cache/setGet.js";
import { mergeLatestMonitoringWithSslCache } from "$lib/server/controllers/monitorsController";

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
  const [rawUptimeData, latestData, cached] = await Promise.all([
    db.getStatusCountsByInterval(monitor.tag, startTime, 86400, days),
    db.getLatestMonitoringData(monitor.tag),
    GetLastMonitoringValue(monitor.tag).catch(() => null),
  ]);

  const latest = mergeLatestMonitoringWithSslCache(latestData, cached);

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
  latestData?: MonitoringData | { timestamp: number; latency: number | null; error_message?: string | null } | null,
): MonitorBarResponse => {
  const startTime = endOfDayTodayAtTz - days * 24 * 60 * 60;
  const monitorSettings = parseMonitorSettings(monitor.monitor_settings_json);
  const uptimeCalculationResult = UptimeCalculator(
    rawUptimeData,
    monitorSettings.uptime_formula_numerator,
    monitorSettings.uptime_formula_denominator,
  );

  const sslExpiresAt =
    monitor.monitor_type === "SSL" ? ResolveSslExpiresAtMs(latestData as MonitoringData | null | undefined) : null;
  const sslRemaining = monitor.monitor_type === "SSL" ? FormatSslRemaining(sslExpiresAt) || null : null;

  let issuerCn: string | null = null;
  let issuerO: string | null = null;
  if (monitor.monitor_type === "SSL" && latestData) {
    const cached = latestData as MonitoringData;
    issuerCn = cached.issuer_cn ?? null;
    issuerO = cached.issuer_o ?? null;
    if (!issuerCn && !issuerO) {
      const parsed = ParseSslIssuerFromMessage(cached.error_message);
      issuerCn = parsed.issuer_cn;
      issuerO = parsed.issuer_o;
    }
  }

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
    sslExpiresAt,
    sslRemaining,
    issuerCn,
    issuerO,
  };
};

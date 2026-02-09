import { GetMinuteStartNowTimestampUTC } from "../tool.js";
import GC from "../../global-constants.js";
import type { GroupMonitor, MonitoringResult } from "../types/monitor.js";
import { GetLastMonitoringValue } from "../cache/setGet.js";
import { GetLatestMonitoringData } from "../controllers/controller.js";

/**
 * Numeric scores for each status.
 * UP = 0, DEGRADED = 1, DOWN = 2, MAINTENANCE = 3
 */
const STATUS_SCORE: Record<string, number> = {
  [GC.UP]: 0,
  [GC.DEGRADED]: 1,
  [GC.DOWN]: 2,
  [GC.MAINTENANCE]: 3,
};

/** Map a weighted score back to a status string. */
function scoreToStatus(score: number): string {
  if (score >= 3) return GC.MAINTENANCE;
  if (score >= 2) return GC.DOWN;
  if (score >= 1) return GC.DEGRADED;
  return GC.UP;
}

class GroupCall {
  monitor: GroupMonitor;

  constructor(monitor: GroupMonitor, _timestamp?: number) {
    this.monitor = monitor;
  }

  async execute(startOfMinute?: number): Promise<MonitoringResult> {
    if (!startOfMinute) {
      startOfMinute = GetMinuteStartNowTimestampUTC();
    }
    const members = this.monitor.type_data.monitors;

    // Collect each member's latest status + latency
    const statusMap = new Map<string, { status: string; latency: number }>();

    for (const member of members) {
      const lastObj = (await GetLastMonitoringValue(member.tag, () => GetLatestMonitoringData(member.tag))) as {
        status: string;
        latency: number;
      } | null;
      if (lastObj) {
        statusMap.set(member.tag, lastObj);
      }
    }

    // --- Latency calculation ---
    const latencyValues = [...statusMap.values()].map((v) => v.latency);
    const latencyCalculationType = this.monitor.type_data.latencyCalculation || "AVG";
    let latency = 0;
    if (latencyValues.length > 0) {
      if (latencyCalculationType === "AVG") {
        latency = latencyValues.reduce((a, b) => a + b, 0) / latencyValues.length;
      } else if (latencyCalculationType === "MAX") {
        latency = Math.max(...latencyValues);
      } else if (latencyCalculationType === "MIN") {
        latency = Math.min(...latencyValues);
      }
    }

    // --- Status calculation via weighted scores ---
    // Each status has a numeric score: UP=0, DEGRADED=1, DOWN=2, MAINTENANCE=3
    // Weighted sum = Σ(weight × score), weights should sum to 1.
    // Result is mapped back: <1 → UP, ≥1 → DEGRADED, ≥2 → DOWN, ≥3 → MAINTENANCE
    let weightedScore = 0;
    let totalWeight = 0;

    for (const member of members) {
      const data = statusMap.get(member.tag);
      if (!data) continue;
      const score = STATUS_SCORE[data.status] ?? 0;
      weightedScore += member.weight * score;
      totalWeight += member.weight;
    }

    // Normalize if weights don't sum to 1 (safety net)
    if (totalWeight > 0 && totalWeight !== 1) {
      weightedScore = weightedScore / totalWeight;
    }

    const status = scoreToStatus(weightedScore);

    return { status, latency, type: GC.REALTIME };
  }
}

export default GroupCall;

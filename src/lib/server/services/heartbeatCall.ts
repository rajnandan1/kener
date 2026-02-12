import GC from "../../global-constants.js";
import { GetNowTimestampUTCInMs } from "../tool.js";
import { GetLastHeartbeat as GetLastHeartbeatFromCache } from "../cache/setGet.js";
import type { HeartbeatMonitor, MonitoringResult } from "../types/monitor.js";
import { GetLastHeartbeat as GetLastHeartbeatFromDb } from "../controllers/monitorsController.js";

function toMs(ts: number): number {
  // Cache historically stored ms, DB stores seconds.
  return ts >= 1_000_000_000_000 ? ts : ts * 1000;
}

class HeartbeatCall {
  monitor: HeartbeatMonitor;

  constructor(monitor: HeartbeatMonitor) {
    this.monitor = monitor;
  }

  async execute(): Promise<MonitoringResult> {
    const nowMs = GetNowTimestampUTCInMs();

    const cached = await GetLastHeartbeatFromCache(this.monitor.tag);
    let lastHeartbeatMs: number | null = cached?.timestamp != null ? toMs(cached.timestamp) : null;

    if (lastHeartbeatMs == null) {
      const dbSignal = await GetLastHeartbeatFromDb(this.monitor.tag);
      lastHeartbeatMs = dbSignal?.timestamp != null ? toMs(dbSignal.timestamp) : null;
    }

    if (lastHeartbeatMs == null) {
      return {
        status: GC.NO_DATA,
        latency: 0,
        type: GC.REALTIME,
        error_message: "No heartbeat received yet",
      };
    }

    const diffInMs = Math.max(0, nowMs - lastHeartbeatMs);

    const downMinutes = Number(this.monitor.type_data?.downRemainingMinutes ?? 10);
    const degradedMinutes = Number(this.monitor.type_data?.degradedRemainingMinutes ?? 5);
    const downThresholdMs = (Number.isFinite(downMinutes) ? downMinutes : 10) * 60 * 1000;
    const degradedThresholdMs = (Number.isFinite(degradedMinutes) ? degradedMinutes : 5) * 60 * 1000;

    if (diffInMs > downThresholdMs) {
      return {
        status: GC.DOWN,
        latency: diffInMs,
        type: GC.REALTIME,
        error_message: `No heartbeat received in the last ${downMinutes} minutes`,
      };
    }

    if (diffInMs > degradedThresholdMs) {
      return {
        status: GC.DEGRADED,
        latency: diffInMs,
        type: GC.REALTIME,
        error_message: `No heartbeat received in the last ${degradedMinutes} minutes`,
      };
    }

    return {
      status: GC.UP,
      latency: diffInMs,
      type: GC.REALTIME,
    };
  }
}

export default HeartbeatCall;

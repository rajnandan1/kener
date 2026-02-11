import GC from "../../global-constants.js";
import { GetMinuteStartNowTimestampUTC, GetNowTimestampUTCInMs } from "../tool.js";
import { GetLastHeartbeat } from "../cache/setGet.js";
import { Cron } from "croner";
import type { HeartbeatMonitor, MonitoringResult } from "../types/monitor.js";

class HeartbeatCall {
  monitor: HeartbeatMonitor;

  constructor(monitor: HeartbeatMonitor) {
    this.monitor = monitor;
  }

  async execute(): Promise<MonitoringResult> {
    let nowMinute = GetNowTimestampUTCInMs(); // current time in milliseconds
    let latestData = await GetLastHeartbeat(this.monitor.tag);
    if (!latestData) {
      return {
        status: GC.DOWN,
        latency: 0,
        type: GC.REALTIME,
      };
    }

    //timestamp of latest heartbeat is in seconds, convert to milliseconds for comparison
    const diffInMs = nowMinute - latestData.timestamp;
    let downRemainingMinutesInMs = Number(this.monitor.type_data.downRemainingMinutes) * 60 * 1000;
    if (diffInMs > downRemainingMinutesInMs) {
      return {
        status: GC.DOWN,
        latency: diffInMs,
        type: GC.REALTIME,
      };
    }

    let degradedRemainingMinutesInMs = Number(this.monitor.type_data.degradedRemainingMinutes) * 60 * 1000;
    if (diffInMs > degradedRemainingMinutesInMs) {
      return {
        status: GC.DEGRADED,
        latency: diffInMs,
        type: GC.REALTIME,
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

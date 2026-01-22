import { UP, DOWN, DEGRADED, REALTIME, TIMEOUT, ERROR, MANUAL } from "../constants.js";
import { GetMinuteStartNowTimestampUTC } from "../tool.js";
import { GetLastHeartbeat } from "../controllers/controller.js";
import { Cron } from "croner";
import type { HeartbeatMonitor, MonitoringResult } from "../types/monitor.js";
import { NODATA } from "dns";

class HeartbeatCall {
  monitor: HeartbeatMonitor;

  constructor(monitor: HeartbeatMonitor) {
    this.monitor = monitor;
  }

  async execute(): Promise<MonitoringResult> {
    let nowMinute = GetMinuteStartNowTimestampUTC(); // current time in seconds (minute start)
    let latestData = await GetLastHeartbeat(this.monitor.tag);
    if (!latestData) {
      return {
        status: NODATA,
        latency: 0,
        type: REALTIME,
      };
    }

    // Use croner to calculate expected heartbeat time
    let expectedTime: number;
    try {
      const cronJob = new Cron(this.monitor.cron || "");
      const prevDate = cronJob.previousRun();
      if (!prevDate) {
        return {
          status: DOWN,
          latency: 0,
          type: ERROR,
        };
      }
      expectedTime = Math.floor(prevDate.getTime() / 1000); // seconds
    } catch (err) {
      return {
        status: DOWN,
        latency: 0,
        type: ERROR,
      };
    }

    // If heartbeat was received after or at expected time, it's UP
    if (latestData.timestamp >= expectedTime) {
      return {
        status: UP,
        latency: nowMinute - latestData.timestamp,
        type: REALTIME,
      };
    }

    // Calculate how late the expected heartbeat is
    let latency = nowMinute - expectedTime;
    let downRemainingMinutes = Number(this.monitor.type_data.downRemainingMinutes);
    if (latency > downRemainingMinutes * 60) {
      return {
        status: DOWN,
        latency: latency,
        type: REALTIME,
      };
    }

    let degradedRemainingMinutes = Number(this.monitor.type_data.degradedRemainingMinutes);
    if (latency > degradedRemainingMinutes * 60) {
      return {
        status: DEGRADED,
        latency: latency,
        type: REALTIME,
      };
    }

    return {
      status: UP,
      latency: latency,
      type: REALTIME,
    };
  }
}

export default HeartbeatCall;

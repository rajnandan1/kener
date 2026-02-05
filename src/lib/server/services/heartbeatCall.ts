import GC from "../../global-constants.js";
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
        status: GC.NO_DATA,
        latency: 0,
        type: GC.REALTIME,
      };
    }

    // Use croner to calculate expected heartbeat time
    let expectedTime: number;
    try {
      const cronJob = new Cron(this.monitor.cron || "");
      const prevDate = cronJob.previousRun();
      if (!prevDate) {
        return {
          status: GC.DOWN,
          latency: 0,
          type: GC.ERROR,
        };
      }
      expectedTime = Math.floor(prevDate.getTime() / 1000); // seconds
    } catch (err) {
      return {
        status: GC.DOWN,
        latency: 0,
        type: GC.ERROR,
      };
    }

    // If heartbeat was received after or at expected time, it's UP
    if (latestData.timestamp >= expectedTime) {
      return {
        status: GC.UP,
        latency: nowMinute - latestData.timestamp,
        type: GC.REALTIME,
      };
    }

    // Calculate how late the expected heartbeat is
    let latency = nowMinute - expectedTime;
    let downRemainingMinutes = Number(this.monitor.type_data.downRemainingMinutes);
    if (latency > downRemainingMinutes * 60) {
      return {
        status: GC.DOWN,
        latency: latency,
        type: GC.REALTIME,
      };
    }

    let degradedRemainingMinutes = Number(this.monitor.type_data.degradedRemainingMinutes);
    if (latency > degradedRemainingMinutes * 60) {
      return {
        status: GC.DEGRADED,
        latency: latency,
        type: GC.REALTIME,
      };
    }

    return {
      status: GC.UP,
      latency: latency,
      type: GC.REALTIME,
    };
  }
}

export default HeartbeatCall;

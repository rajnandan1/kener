// @ts-nocheck
import { UP, DOWN, DEGRADED, REALTIME, TIMEOUT, ERROR, MANUAL } from "../constants.js";
import { GetMinuteStartNowTimestampUTC } from "../tool.js";
import { GetLastHeartbeat } from "../controllers/controller.js";
import { Cron } from "croner";

class HeartbeatCall {
  monitor;

  constructor(monitor) {
    this.monitor = monitor;
  }

  async execute() {
    let nowMinute = GetMinuteStartNowTimestampUTC(); // current time in seconds (minute start)
    let latestData = await GetLastHeartbeat(this.monitor.tag);
    if (!latestData) {
      return {};
    }

    // Use croner to calculate expected heartbeat time
    let expectedTime;
    try {
      const cronJob = Cron(this.monitor.cron);
      const prevDate = cronJob.previousRun();
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

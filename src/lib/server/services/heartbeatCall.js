// @ts-nocheck
import { UP, DOWN, DEGRADED, REALTIME, TIMEOUT, ERROR, MANUAL } from "../constants.js";
import { GetMinuteStartNowTimestampUTC } from "../tool.js";
import { GetLastHeartbeat } from "../controllers/controller.js";

class HeartbeatCall {
  monitor;

  constructor(monitor) {
    this.monitor = monitor;
  }

  async execute() {
    let nowMinute = GetMinuteStartNowTimestampUTC();
    let latestData = await GetLastHeartbeat(this.monitor.tag);
    if (!latestData) {
      return {};
    }
    let latency = nowMinute - latestData.timestamp;
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

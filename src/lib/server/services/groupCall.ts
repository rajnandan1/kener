import axios from "axios";
import { GetRequiredSecrets, ReplaceAllOccurrences, Wait, GetMinuteStartNowTimestampUTC } from "../tool.js";
import GC from "../../global-constants.js";
import db from "../db/db.js";
import type { GroupMonitor, MonitoringResult } from "../types/monitor.js";

async function waitForDataAndReturn(tag: string): Promise<MonitoringResult> {
  let res = await db.getLatestMonitoringData(tag);
  if (!!res) {
    return {
      status: res.status || GC.DOWN,
      latency: res.latency || 0,
      type: GC.REALTIME,
    };
  }
  return {
    status: GC.DOWN,
    latency: 0,
    type: GC.REALTIME,
  };
}

class GroupCall {
  monitor: GroupMonitor;

  constructor(monitor: GroupMonitor, timestamp?: number) {
    this.monitor = monitor;
  }

  async execute(startOfMinute?: number): Promise<MonitoringResult> {
    if (!!!startOfMinute) {
      startOfMinute = GetMinuteStartNowTimestampUTC();
    }
    let tagArr = this.monitor.type_data.monitors.map((m) => m.tag);
    return await waitForDataAndReturn(this.monitor.tag);
  }
}

export default GroupCall;

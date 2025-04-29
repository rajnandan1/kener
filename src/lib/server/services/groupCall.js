// @ts-nocheck
import axios from "axios";
import { GetRequiredSecrets, ReplaceAllOccurrences, Wait, GetMinuteStartNowTimestampUTC } from "../tool.js";
import { UP, DOWN, DEGRADED, REALTIME, TIMEOUT, ERROR, MANUAL } from "../constants.js";
import db from "../db/db.js";

async function waitForDataAndReturn(tag) {
  let res = await db.getLatestMonitoringData(tag);
  if (!!res) {
    return {
      status: res.status,
      latency: res.latency,
      type: REALTIME,
    };
  }
  return null;
}

class GroupCall {
  monitor;

  constructor(monitor, timestamp) {
    this.monitor = monitor;
  }

  async execute(startOfMinute) {
    if (!!!startOfMinute) {
      startOfMinute = GetMinuteStartNowTimestampUTC();
    }
    let tagArr = this.monitor.type_data.monitors.map((m) => m.tag);
    return await waitForDataAndReturn(this.monitor.tag);
  }
}

export default GroupCall;

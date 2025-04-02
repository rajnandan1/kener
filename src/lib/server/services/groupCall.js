// @ts-nocheck
import axios from "axios";
import { GetRequiredSecrets, ReplaceAllOccurrences, Wait, GetMinuteStartNowTimestampUTC } from "../tool.js";
import { UP, DOWN, DEGRADED, REALTIME, TIMEOUT, ERROR, MANUAL } from "../constants.js";
import db from "../db/db.js";

async function waitForDataAndReturn(arr, ts, d, maxTime) {
  await Wait(d);

  let data = await db.getLastStatusBeforeCombined(arr, ts);
  if (data) {
    data.type = REALTIME;
    return data;
  } else if (d > maxTime) {
    data = await db.getLastStatusBeforeCombined(arr, ts, ts - 86400);
    if (data) {
      data.type = REALTIME;
      return data;
    }
    return {
      status: DOWN,
      latency: 0,
      type: TIMEOUT,
    };
  } else {
    return await waitForDataAndReturn(arr, ts, d + 500, maxTime);
  }
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
    return await waitForDataAndReturn(tagArr, startOfMinute, 500, this.monitor.type_data.timeout);
  }
}

export default GroupCall;

import axios from "axios";
import { GetRequiredSecrets, ReplaceAllOccurrences, Wait, GetMinuteStartNowTimestampUTC } from "../tool.js";
import GC from "../../global-constants.js";
import db from "../db/db.js";
import type { GroupMonitor, MonitoringResult } from "../types/monitor.js";
import { GetLastMonitoringValue } from "../cache/setGet.js";
import { GetLatestMonitoringData } from "../controllers/controller.js";

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

//implement a function that takes array of statuses
//UP, DEGRADED, MAINTENANCE, DOWN
// takes a parameter called statusCalculationType which can be "ANY", "ALL", "MAJORITY"
//MAINTENANCE > DOWN > DEGRADED > UP

class GroupCall {
  monitor: GroupMonitor;

  constructor(monitor: GroupMonitor, timestamp?: number) {
    this.monitor = monitor;
  }

  async execute(startOfMinute?: number): Promise<MonitoringResult> {
    if (!!!startOfMinute) {
      startOfMinute = GetMinuteStartNowTimestampUTC();
    }
    const dataPoints: Array<{ status: string; latency: number }> = [];
    const monitorTagArr = this.monitor.type_data.monitors.map((m) => m.tag);
    for (const tag of monitorTagArr) {
      let lastObj = (await GetLastMonitoringValue(tag, () => GetLatestMonitoringData(tag))) as {
        status: string;
        latency: number;
      } | null;
      if (!!lastObj) {
        dataPoints.push(lastObj);
      }
    }

    const latencyCalculationType = this.monitor.type_data.latencyCalculation || "AVG";
    let latency = 0;
    if (latencyCalculationType === "AVG") {
      latency = dataPoints.reduce((acc, val) => acc + val.latency, 0) / dataPoints.length;
    } else if (latencyCalculationType === "MAX") {
      latency = Math.max(...dataPoints.map((d) => d.latency));
    } else if (latencyCalculationType === "MIN") {
      latency = Math.min(...dataPoints.map((d) => d.latency));
    }

    //status calculation: if any monitor is MAINTENANCE, then group monitor is MAINTENANCE.
    // else if any monitor is DOWN, then group monitor is DOWN.
    // else if any monitor is DEGRADED, then group monitor is DEGRADED.
    // else group monitor is UP.

    let status: string = GC.UP;
    if (dataPoints.some((d) => d.status === GC.MAINTENANCE)) {
      status = GC.MAINTENANCE;
    } else if (dataPoints.some((d) => d.status === GC.DOWN)) {
      status = GC.DOWN;
    } else if (dataPoints.some((d) => d.status === GC.DEGRADED)) {
      status = GC.DEGRADED;
    }

    return {
      status,
      latency,
      type: GC.REALTIME,
    };
  }
}

export default GroupCall;

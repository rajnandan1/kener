import { GetMinuteStartNowTimestampUTC } from "./tool.js";
import monitorExecuteQueue from "./queues/monitorExecuteQueue";

import dotenv from "dotenv";
import type { MonitorRecordTyped } from "./types/db.js";

import { MONITOR_TYPES, type MonitorType } from "../types/monitor.js";
import type { JobsOptions } from "bullmq";

dotenv.config();
const Minuter = async (monitor: MonitorRecordTyped) => {
  if (!MONITOR_TYPES.includes(monitor.monitor_type as MonitorType)) {
    throw new Error(`Invalid monitor type: ${monitor.monitor_type}. Valid types are: ${MONITOR_TYPES.join(", ")}`);
  }
  const startOfMinute = GetMinuteStartNowTimestampUTC();
  let options: JobsOptions | undefined = undefined;
  if (monitor.monitor_type === "GROUP") {
    options = {
      delay: parseInt(String(monitor.type_data?.executionDelay)) || 1000, // default 1 second delay for group monitors
    };
  }
  await monitorExecuteQueue.push(monitor, startOfMinute, options);
};

export { Minuter };

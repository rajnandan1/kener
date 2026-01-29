import axios from "axios";
import constants from "../global-constants.js";
import { GetMinuteStartNowTimestampUTC, ReplaceAllOccurrences, GetRequiredSecrets, Wait } from "./tool.js";
import monitorExecuteQueue from "./queues/monitorExecuteQueue";

import dotenv from "dotenv";
import db from "./db/db.js";
import type { MonitorRecordTyped } from "./types/db.js";

import type { MonitoringResult } from "./types/monitor.js";
import { MONITOR_TYPES, type MonitorType } from "../types/monitor.js";

dotenv.config();
const Minuter = async (monitor: MonitorRecordTyped) => {
  if (!MONITOR_TYPES.includes(monitor.monitor_type as MonitorType)) {
    throw new Error(`Invalid monitor type: ${monitor.monitor_type}. Valid types are: ${MONITOR_TYPES.join(", ")}`);
  }
  const startOfMinute = GetMinuteStartNowTimestampUTC();
  await monitorExecuteQueue.push(monitor, startOfMinute);
};

export { Minuter };

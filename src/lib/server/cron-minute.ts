import axios from "axios";
import constants from "../global-constants.js";
import { GetMinuteStartNowTimestampUTC, ReplaceAllOccurrences, GetRequiredSecrets, Wait } from "./tool.js";
import monitorExecuteQueue from "./queues/monitorExecuteQueue";

import alerting from "./alerting.js";
import Queue from "queue";
import dotenv from "dotenv";
import db from "./db/db.js";
import { InsertMonitoringData } from "./controllers/controller.js";
import type { MonitorRecordTyped } from "./types/db.js";

import type { MonitorWithType } from "./services/service.js";
import type { MonitoringResult } from "./types/monitor.js";
import { MONITOR_TYPES, type MonitorType } from "../types/monitor.js";

dotenv.config();

const alertingQueue = new Queue({
  concurrency: 10, // Number of tasks that can run concurrently
  timeout: 10000, // Timeout in ms after which a task will be considered as failed (optional)
  autostart: true, // Automatically start the queue (optional)
});
const apiQueue = new Queue({
  concurrency: 10, // Number of tasks that can run concurrently
  timeout: 2 * 60 * 1000, // Timeout in ms after which a task will be considered as failed (optional)
  autostart: true, // Automatically start the queue (optional)
});

async function manualIncident(monitor: MonitorRecordTyped): Promise<{ [timestamp: number]: MonitoringResult }> {
  let startTs = GetMinuteStartNowTimestampUTC();
  let incidentArr = await db.getIncidentsByMonitorTagRealtime(monitor.tag, startTs);
  let maintenanceArr = await db.getMaintenanceByMonitorTagRealtime(monitor.tag, startTs);

  let impactArr = incidentArr.concat(maintenanceArr);

  let impact = "";
  if (impactArr.length == 0) {
    return {};
  }

  for (let i = 0; i < impactArr.length; i++) {
    const element = impactArr[i];

    if (element.monitor_impact === constants.MAINTENANCE) {
      impact = constants.MAINTENANCE;
      break;
    }
    if (element.monitor_impact === constants.DOWN) {
      impact = constants.DOWN;
      break;
    }
    if (element.monitor_impact === constants.DEGRADED) {
      impact = constants.DEGRADED;
    }
  }

  if (impact === "") {
    return {};
  }

  let manualData = {
    [startTs]: {
      status: impact,
      latency: 0,
      type: constants.MANUAL,
    },
  };

  return manualData;
}

const Minuter = async (monitor: MonitorRecordTyped) => {
  if (!MONITOR_TYPES.includes(monitor.monitor_type as MonitorType)) {
    throw new Error(`Invalid monitor type: ${monitor.monitor_type}. Valid types are: ${MONITOR_TYPES.join(", ")}`);
  }
  const startOfMinute = GetMinuteStartNowTimestampUTC();
  await monitorExecuteQueue.push(monitor, startOfMinute);

  // alertingQueue.push(async (cb) => {
  //   setTimeout(async () => {
  //     try {
  //       await alerting(monitor);
  //       cb ? cb() : null;
  //     } catch (e) {
  //       console.log(`[Error] in Running Alerting name: ${monitor.name}, tag: ${monitor.tag} error:`, e);
  //       cb ? cb() : null;
  //     }
  //   }, 1042);
  // });
};

alertingQueue.start((err) => {
  if (err) {
    console.error("Error occurred:", err);
    process.exit(1);
  }
});
apiQueue.start((err) => {
  if (err) {
    console.error("Error occurred:", err);
    process.exit(1);
  }
});
export { Minuter };

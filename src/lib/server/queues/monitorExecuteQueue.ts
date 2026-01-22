import type { MonitoringResult, MonitoringResultTS } from "../types/monitor.js";
import { Queue, Worker, Job, type JobsOptions } from "bullmq";
import q from "./q.js";
import { InsertMonitoringData } from "../controllers/controller.js";
import type { MonitorRecordTyped } from "../types/db.js";
import Service, { type MonitorWithType } from "../services/service.js";
import { GetMinuteStartNowTimestampUTC } from "../tool.js";
import db from "../db/db.js";
import { UP, DOWN, DEGRADED, TIMEOUT, MANUAL, DEFAULT_STATUS } from "../constants.js";
import monitorResponseQueue from "./monitorResponseQueue";

let monitorExecuteQueue: Queue | null = null;
let worker: Worker | null = null;
const queueName = "monitorExecuteQueue";
const jobNamePrefix = "monitorExecuteJob";

interface JobData {
  monitor: MonitorRecordTyped;
  ts: number;
  executeOptions?: ExecuteOptions;
}

interface ExecuteOptions {
  countTimeoutRetries?: number;
  maxTimeoutRetries?: number;
}

const getQueue = () => {
  if (!monitorExecuteQueue) {
    monitorExecuteQueue = q.createQueue(queueName);
  }
  return monitorExecuteQueue;
};

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

    if (element.monitor_impact === "MAINTENANCE") {
      impact = "MAINTENANCE";
      break;
    }
    if (element.monitor_impact === "DOWN") {
      impact = "DOWN";
      break;
    }
    if (element.monitor_impact === "DEGRADED") {
      impact = "DEGRADED";
    }
  }

  if (impact === "") {
    return {};
  }

  let manualData = {
    [startTs]: {
      status: impact,
      latency: 0,
      type: MANUAL,
    },
  };

  return manualData;
}
const addWorker = () => {
  if (worker) return worker;

  worker = q.createWorker(getQueue(), async (job: Job): Promise<MonitoringResultTS> => {
    const { monitor, ts, executeOptions } = job.data as JobData;
    const serviceClient = new Service(monitor as MonitorWithType);

    const exeResult = await serviceClient.execute(ts);
    if (exeResult && exeResult.type === TIMEOUT && monitor.monitor_type === "API") {
      let countTimeoutRetries = executeOptions?.countTimeoutRetries || 0;
      let maxTimeoutRetries = executeOptions?.maxTimeoutRetries || 3;
      if (countTimeoutRetries < maxTimeoutRetries) {
        console.log(
          `Timeout detected for monitor ${monitor.tag} at ${ts}. Retrying ${countTimeoutRetries + 1}/${maxTimeoutRetries}...`,
        );
        await push(
          monitor,
          ts,
          {
            ...executeOptions,
            countTimeoutRetries: countTimeoutRetries + 1,
          },
          { delay: 500 },
        );
        return {
          [ts]: exeResult,
        };
      }
    }

    let realtimeData: MonitoringResultTS = {};
    if (exeResult) {
      realtimeData[ts] = exeResult;
    }
    let incidentData: MonitoringResultTS = await manualIncident(monitor);
    let defaultData: MonitoringResultTS = {};
    let mergedData: MonitoringResultTS = {};

    if (monitor.default_status !== undefined && monitor.default_status !== null) {
      if ([UP, DOWN, DEGRADED].indexOf(monitor.default_status) !== -1) {
        defaultData[ts] = {
          status: monitor.default_status,
          latency: 0,
          type: DEFAULT_STATUS,
        };
      }
    }
    mergedData = { ...defaultData, ...realtimeData, ...incidentData };

    for (const timestamp in mergedData) {
      monitorResponseQueue.push(monitor.tag, parseInt(timestamp), mergedData[timestamp]);
    }

    return mergedData;
  });

  worker.on("completed", (job: Job, returnvalue: any) => {
    const { monitor, ts } = job.data as JobData;
    console.log(`Queue: ${queueName} for ${monitor.tag} at ${ts} has completed! Results:`, returnvalue);
  });

  return worker;
};

export const push = async (
  monitor: MonitorRecordTyped,
  ts: number,
  executeOptions?: ExecuteOptions,
  options?: JobsOptions,
) => {
  const deDupId = `${monitor.tag}-${ts}`;
  if (!options) {
    options = {};
  }
  if (!options.deduplication) {
    options.deduplication = {
      id: deDupId,
    };
  }
  const queue = getQueue();
  addWorker();
  await queue.add(
    jobNamePrefix + "_" + monitor.tag,
    {
      monitor,
      ts,
      executeOptions,
    },
    options,
  );
};

//graceful shutdown
export const shutdown = async () => {
  if (worker) {
    await worker.close();
    worker = null;
  }
};

export default {
  push,
  shutdown,
};

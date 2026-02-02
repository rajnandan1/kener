import type { MonitoringResult, MonitoringResultTS } from "../types/monitor.js";
import { Queue, Worker, Job, type JobsOptions } from "bullmq";
import q from "./q.js";
import type { MonitorRecordTyped } from "../types/db.js";
import Service, { type MonitorWithType } from "../services/service.js";
import { GetMinuteStartNowTimestampUTC } from "../tool.js";
import db from "../db/db.js";
import monitorResponseQueue from "./monitorResponseQueue";
import GC from "../../global-constants.js";

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

async function manualMaintenance(monitor: MonitorRecordTyped): Promise<{ [timestamp: number]: MonitoringResult }> {
  let startTs = GetMinuteStartNowTimestampUTC();
  let maintenanceArr = await db.getMaintenancesByMonitorTagRealtime(monitor.tag, startTs);

  let impact = "";
  if (maintenanceArr.length == 0) {
    return {};
  }

  for (let i = 0; i < maintenanceArr.length; i++) {
    const element = maintenanceArr[i];

    if (element.monitor_impact === GC.MAINTENANCE) {
      impact = GC.MAINTENANCE;
      break;
    }
    if (element.monitor_impact === GC.DOWN) {
      impact = GC.DOWN;
      break;
    }
    if (element.monitor_impact === GC.DEGRADED) {
      impact = GC.DEGRADED;
    }
  }

  if (impact === "") {
    return {};
  }

  let manualData = {
    [startTs]: {
      status: impact,
      latency: 0,
      type: GC.MANUAL,
      error_message: "Status set by manual maintenance",
    },
  };

  return manualData;
}

async function manualIncident(monitor: MonitorRecordTyped): Promise<{ [timestamp: number]: MonitoringResult }> {
  let startTs = GetMinuteStartNowTimestampUTC();
  let incidentArr = await db.getIncidentsByMonitorTagRealtime(monitor.tag, startTs);

  let impact = "";
  if (incidentArr.length == 0) {
    return {};
  }

  for (let i = 0; i < incidentArr.length; i++) {
    const element = incidentArr[i];

    if (element.monitor_impact === GC.MAINTENANCE) {
      impact = GC.MAINTENANCE;
      break;
    }
    if (element.monitor_impact === GC.DOWN) {
      impact = GC.DOWN;
      break;
    }
    if (element.monitor_impact === GC.DEGRADED) {
      impact = GC.DEGRADED;
    }
  }

  if (impact === "") {
    return {};
  }

  let manualData = {
    [startTs]: {
      status: impact,
      latency: 0,
      type: GC.MANUAL,
      error_message: "Status set by manual incident",
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

    // if (exeResult && exeResult.type === GC.TIMEOUT && monitor.monitor_type === "API") {
    //   let countTimeoutRetries = executeOptions?.countTimeoutRetries || 0;
    //   let maxTimeoutRetries = executeOptions?.maxTimeoutRetries || 3;
    //   if (countTimeoutRetries < maxTimeoutRetries) {
    //     console.log(
    //       `Timeout detected for monitor ${monitor.tag} at ${ts}. Retrying ${countTimeoutRetries + 1}/${maxTimeoutRetries}...`,
    //     );
    //     await push(
    //       monitor,
    //       ts,
    //       {
    //         ...executeOptions,
    //         countTimeoutRetries: countTimeoutRetries + 1,
    //       },
    //       { delay: 500 },
    //     );
    //     return {
    //       [ts]: exeResult,
    //     };
    //   }
    // }

    let realtimeData: MonitoringResultTS = {};
    if (exeResult) {
      realtimeData[ts] = exeResult;
    }
    let incidentData: MonitoringResultTS = await manualIncident(monitor);
    let maintenanceData: MonitoringResultTS = await manualMaintenance(monitor);
    let defaultData: MonitoringResultTS = {};
    let mergedData: MonitoringResultTS = {};

    if (monitor.default_status !== undefined && monitor.default_status !== null) {
      if (([GC.UP, GC.DOWN, GC.DEGRADED] as string[]).indexOf(monitor.default_status) !== -1) {
        defaultData[ts] = {
          status: monitor.default_status,
          latency: 0,
          type: GC.DEFAULT_STATUS,
        };
        if (monitor.default_status !== GC.UP) {
          defaultData[ts].error_message = "Default status applied";
        }
      }
    }

    // Merge data: later entries override earlier ones for all fields except error_message
    mergedData = { ...defaultData, ...realtimeData, ...incidentData, ...maintenanceData };

    // Preserve error_message with cascading priority:
    // default → realtime → incident → maintenance
    // Each level only overrides if it has its own error_message
    for (const timestamp in mergedData) {
      const ts = parseInt(timestamp);
      let errorMessage: string | undefined = defaultData[ts]?.error_message;
      if (realtimeData[ts]?.error_message) {
        errorMessage = realtimeData[ts].error_message;
      }
      if (incidentData[ts]?.error_message) {
        errorMessage = incidentData[ts].error_message;
      }
      if (maintenanceData[ts]?.error_message) {
        errorMessage = maintenanceData[ts].error_message;
      }
      if (errorMessage) {
        mergedData[ts].error_message = errorMessage;
      }
    }

    for (const timestamp in mergedData) {
      monitorResponseQueue.push(monitor.tag, parseInt(timestamp), mergedData[timestamp]);
    }

    return mergedData;
  });

  worker.on("completed", (job: Job, returnvalue: any) => {
    const { monitor, ts } = job.data as JobData;
    console.log(`📀 Execute: ${monitor.tag} @ ${new Date(ts * 1000).toISOString()}`);
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

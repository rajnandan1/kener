import type { MonitoringResult, MonitoringResultTS } from "../types/monitor.js";
import { Queue, Worker, Job, type JobsOptions } from "bullmq";
import q from "./q.js";
import type { MonitorRecordTyped } from "../types/db.js";
import Service, { type MonitorWithType } from "../services/service.js";
import { GetMinuteStartNowTimestampUTC } from "../tool.js";
import db from "../db/db.js";
import monitorResponseQueue from "./monitorResponseQueue";
import GC from "../../global-constants.js";
import { resolveConfirmedStatus } from "../services/confirmationThreshold.js";

let monitorExecuteQueue: Queue | null = null;
let worker: Worker | null = null;
const queueName = "monitorExecuteQueue";
const jobNamePrefix = "monitorExecuteJob";

interface JobData {
  monitor: MonitorRecordTyped;
  ts: number;
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
      type: GC.MAINTENANCE,
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
      type: GC.INCIDENT,
      error_message: "Status set by manual incident",
    },
  };

  return manualData;
}
const addWorker = () => {
  if (worker) return worker;

  worker = q.createWorker(getQueue(), async (job: Job): Promise<MonitoringResultTS> => {
    const { monitor, ts } = job.data as JobData;
    const serviceClient = new Service(monitor as MonitorWithType);

    let incidentData: MonitoringResultTS = await manualIncident(monitor);
    let maintenanceData: MonitoringResultTS = await manualMaintenance(monitor);

    const exeResult = await serviceClient.execute(ts);

    let realtimeData: MonitoringResultTS = {};
    if (exeResult) {
      realtimeData[ts] = exeResult;
      // Always record what the check actually observed (forensics + grace counting).
      realtimeData[ts].raw_status = exeResult.status;

      // Confirmation Threshold damping (#712 / ADR 0009): scheduled checks only.
      const threshold = Number(monitor.confirmation_threshold ?? 1);
      const isScheduledCheck = ([GC.REALTIME, GC.TIMEOUT, GC.ERROR] as string[]).indexOf(exeResult.type) !== -1;
      // Confirmation Threshold freezes while an incident/maintenance overlay is active for this
      // minute: the overlay wins display and the count must neither advance nor backfill (#756).
      const overlayActive = incidentData[ts] !== undefined || maintenanceData[ts] !== undefined;
      if (threshold > 1 && isScheduledCheck && !overlayActive) {
        const resolved = await resolveConfirmedStatus({
          monitor_tag: monitor.tag,
          ts,
          rawStatus: exeResult.status,
          threshold,
        });
        realtimeData[ts].status = resolved.status;
        if (resolved.pendingHold) {
          // Hold the confirmed side for display, but keep the real measured latency — zeroing it
          // would lose data and dent the latency chart during every grace window. Only the error
          // text is dropped so a held row never shows a status-contradicting failure message.
          delete realtimeData[ts].error_message;
        }
      }
    }
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
    // Special-case: if realtime returns NO_DATA but a default status exists, prefer default status.
    const defaultStatus = defaultData[ts]?.status;
    const realtimeStatus = realtimeData[ts]?.status;
    let realtimeDataForMerge = realtimeData;
    if (defaultStatus && realtimeStatus === GC.NO_DATA) {
      // Apply the preference *before* merging so incident/maintenance can still override later.
      // Also avoid carrying over realtime NO_DATA error_message.
      realtimeDataForMerge = { ...realtimeData };
      realtimeDataForMerge[ts] = {
        ...realtimeDataForMerge[ts],
        status: defaultStatus,
        type: GC.DEFAULT_STATUS,
      };
      delete realtimeDataForMerge[ts].error_message;
    }

    mergedData = { ...defaultData, ...realtimeDataForMerge, ...incidentData, ...maintenanceData };

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

    // Preserve latency from realtime monitoring
    // Incident/maintenance override status but should keep the actual latency from monitoring
    for (const timestamp in mergedData) {
      const ts = parseInt(timestamp);
      if (realtimeData[ts]?.latency !== undefined && realtimeData[ts].latency > 0) {
        mergedData[ts].latency = realtimeData[ts].latency;
      }
    }

    // Preserve raw_status from realtime monitoring (overlays replace the merged object wholesale,
    // so re-attach the observed value the resolver recorded).
    for (const timestamp in mergedData) {
      const ts = parseInt(timestamp);
      if (realtimeData[ts]?.raw_status !== undefined) {
        mergedData[ts].raw_status = realtimeData[ts].raw_status;
      }
    }

    for (const timestamp in mergedData) {
      monitorResponseQueue.push(monitor.tag, parseInt(timestamp), mergedData[timestamp]);
    }

    return mergedData;
  });

  worker.on("completed", (job: Job, returnvalue: any) => {
    // const { monitor, ts } = job.data as JobData;
    // console.log(`📀 Execute: ${monitor.tag} @ ${new Date(ts * 1000).toISOString()}`);
  });

  return worker;
};

export const push = async (monitor: MonitorRecordTyped, ts: number, options?: JobsOptions) => {
  const deDupId = `${monitor.tag}-${ts}`;
  if (!options) {
    options = {};
  }
  if (!options.deduplication) {
    options.deduplication = {
      id: deDupId,
    };
  }
  options.removeOnComplete = {
    age: 3600, // keep up to 1 hour
    count: 1000, // keep up to 1000 jobs
  };
  options.removeOnFail = {
    age: 24 * 3600, // keep up to 24 hours
  };
  const queue = getQueue();
  addWorker();
  await queue.add(
    jobNamePrefix + "_" + monitor.tag,
    {
      monitor,
      ts,
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

import type { MonitoringResult } from "../types/monitor.js";
import { Queue, Worker, Job, type JobsOptions } from "bullmq";
import q from "./q.js";
import db from "../db/db.js";
import { InsertMonitoringData, NotifySubscribersOnStatusChange } from "../controllers/controller.js";
import { SetLastMonitoringValue } from "../cache/setGet.js";
import alertingQueue from "./alertingQueue.js";
import type { MonitoringData } from "../types/db.js";
let monitorResponseQueue: Queue | null = null;
let worker: Worker | null = null;
const queueName = "monitorResponseQueue";
const jobNamePrefix = "monitorResponseJob";

interface JobData {
  status: string;
  latency: number;
  type: string;
  monitorTag: string;
  ts: number;
  error_message?: string | null;
  raw_status?: string | null;
}

const getQueue = () => {
  if (!monitorResponseQueue) {
    monitorResponseQueue = q.createQueue(queueName);
  }
  return monitorResponseQueue;
};

const addWorker = () => {
  if (worker) return worker;

  worker = q.createWorker(getQueue(), async (job: Job): Promise<MonitoringData | null> => {
    const { monitorTag, ts, status, latency, type, error_message, raw_status } = job.data as JobData;

    // Get old status before inserting new data (for status change detection)
    let oldStatus: string | undefined;
    const latestBefore = await db.getLatestMonitoringData(monitorTag);
    if (latestBefore && latestBefore.status) {
      oldStatus = latestBefore.status;
    }

    const dbRes = await InsertMonitoringData({
      monitor_tag: monitorTag,
      timestamp: ts,
      status: status,
      latency: latency,
      type: type,
      error_message: error_message,
      raw_status: raw_status,
    });

    if (!dbRes) {
      console.error("Failed to insert monitoring data for monitorTag:", monitorTag, "timestamp:", ts);
      throw new Error("Failed to insert monitoring data");
    }

    await SetLastMonitoringValue(monitorTag, {
      monitor_tag: monitorTag,
      timestamp: ts,
      status: status,
      latency: latency,
      type: type,
    });

    // Notify subscribers if status changed
    if (oldStatus && oldStatus !== status) {
      NotifySubscribersOnStatusChange(monitorTag, status, oldStatus).catch((err) =>
        console.error("Failed to notify subscribers:", err),
      );
    }

    alertingQueue.push(monitorTag, ts, status);

    return dbRes;
  });

  worker.on("completed", (job: Job, returnvalue: any) => {
    // const { monitorTag, ts, status, latency, type } = job.data as JobData;
    // console.log(`💾 Store: ${monitorTag} @ ${new Date(ts * 1000).toISOString()}`);
  });

  return worker;
};

export const push = async (monitorTag: string, ts: number, result: MonitoringResult, options?: JobsOptions) => {
  const deDupId = `${monitorTag}-${ts}`;
  if (!options) {
    options = {};
  }
  if (!options.deduplication) {
    options.deduplication = {
      id: deDupId,
    };
  }
  options.removeOnComplete = {
    age: 300, // keep up to 5 minutes
    count: 100, // keep up to 100 jobs
  };
  options.removeOnFail = {
    age: 24 * 3600, // keep up to 24 hours
  };
  const queue = getQueue();
  addWorker();
  await queue.add(
    jobNamePrefix + "_" + monitorTag,
    {
      monitorTag,
      ts,
      ...result,
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

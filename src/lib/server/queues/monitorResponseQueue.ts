import type { MonitoringResult } from "../types/monitor.js";
import { Queue, Worker, Job, type JobsOptions } from "bullmq";
import q from "./q.js";
import { InsertMonitoringData } from "../controllers/controller.js";
import { SetLastMonitoringValue } from "../cache/setGet.js";
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
}

const getQueue = () => {
  if (!monitorResponseQueue) {
    monitorResponseQueue = q.createQueue(queueName);
  }
  return monitorResponseQueue;
};

const addWorker = () => {
  if (worker) return worker;

  worker = q.createWorker(getQueue(), async (job: Job): Promise<number[]> => {
    const { monitorTag, ts, status, latency, type } = job.data as JobData;

    const dbRes = await InsertMonitoringData({
      monitor_tag: monitorTag,
      timestamp: ts,
      status: status,
      latency: latency,
      type: type,
    });

    if (dbRes.length > 0) {
      await SetLastMonitoringValue(monitorTag, {
        monitor_tag: monitorTag,
        timestamp: ts,
        status: status,
        latency: latency,
        type: type,
      });
    }

    return dbRes;
  });

  worker.on("completed", (job: Job, returnvalue: any) => {
    const { monitorTag, ts, status, latency, type } = job.data as JobData;
    console.log(`Queue: ${queueName} for ${monitorTag} at ${ts} has completed! Results:`, returnvalue);
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

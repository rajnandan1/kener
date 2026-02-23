import { Queue, Worker, Job, type JobSchedulerTemplateOptions } from "bullmq";
import q from "../queues/q.js";
import db from "../db/db.js";
import type { DataRetentionPolicy } from "../../types/site.js";

let dailyCleanupQueue: Queue | null = null;
let worker: Worker | null = null;
const queueName = "dailyCleanupQueue";
const jobNamePrefix = "dailyCleanupJob";

interface DailyCleanupResult {
  skipped: boolean;
  deletedRows: number;
  retentionDays: number;
}

const defaultPolicy: DataRetentionPolicy = {
  enabled: true,
  retentionDays: 90,
};

const getQueue = () => {
  if (!dailyCleanupQueue) {
    dailyCleanupQueue = q.createQueue(queueName);
  }
  return dailyCleanupQueue;
};

const getRetentionPolicy = async (): Promise<DataRetentionPolicy> => {
  const policy = await db.getSiteDataByKey("dataRetentionPolicy");
  if (!policy?.value) {
    return defaultPolicy;
  }

  try {
    const parsed = JSON.parse(policy.value) as Partial<DataRetentionPolicy>;
    return {
      enabled: parsed.enabled ?? defaultPolicy.enabled,
      retentionDays: parsed.retentionDays ?? defaultPolicy.retentionDays,
    };
  } catch (error) {
    console.error("Failed to parse dataRetentionPolicy. Using defaults.", error);
    return defaultPolicy;
  }
};

const runDailyCleanup = async (): Promise<DailyCleanupResult> => {
  const policy = await getRetentionPolicy();
  const retentionDays = Math.max(1, Math.floor(policy.retentionDays || defaultPolicy.retentionDays));

  if (!policy.enabled) {
    return {
      skipped: true,
      deletedRows: 0,
      retentionDays,
    };
  }

  const deletedRows = await db.background(retentionDays);

  return {
    skipped: false,
    deletedRows,
    retentionDays,
  };
};

const addWorker = () => {
  if (worker) return worker;

  worker = q.createWorker(getQueue(), async (_job: Job) => {
    console.log("Running daily monitoring_data cleanup...");
    const result = await runDailyCleanup();

    return result;
  });

  worker.on("failed", (_job: Job | undefined, err: Error) => {
    console.error("Daily cleanup scheduler failed:", err);
  });

  return worker;
};

/**
 * Start daily cleanup scheduler
 * Runs at midnight UTC (00:00 UTC) every day
 */
export const start = async (options?: JobSchedulerTemplateOptions) => {
  if (!options) {
    options = {};
  }

  options.removeOnComplete = {
    age: 24 * 3600,
    count: 100,
  };
  options.removeOnFail = {
    age: 7 * 24 * 3600,
  };

  const queue = getQueue();
  addWorker();

  await queue.upsertJobScheduler(
    jobNamePrefix + "_midnight_utc",
    {
      pattern: "0 0 * * *",
    },
    {
      opts: options,
    },
  );

  console.log("Daily cleanup scheduler started (runs at 00:00 UTC)");
};

export const shutdown = async () => {
  if (worker) {
    await worker.close();
    worker = null;
  }
};

export default {
  start,
  shutdown,
};

import type { MonitoringResult } from "../types/monitor.js";
import type { MonitorRecordTyped } from "../types/db";

import { Queue, Worker, Job, type JobsOptions, type JobSchedulerTemplateOptions } from "bullmq";
import q from "../queues/q.js";
import { InsertMonitoringData } from "../controllers/controller.js";
import { HashString } from "../tool.js";
import { getSchedulers, addJobToSchedulerQueue, removeJobFromSchedulerQueue } from "./monitorSchedulers.js";

import { GetMonitorsParsed } from "../controllers/controller.js";
import { GetAllSecrets } from "../controllers/vaultController.js";

let appSchedulerQueue: Queue | null = null;
let worker: Worker | null = null;
const queueName = "appSchedulerQueue";
const jobNamePrefix = "mainJob";

interface JobData {}

const getQueue = () => {
  if (!appSchedulerQueue) {
    appSchedulerQueue = q.createQueue(queueName);
  }
  return appSchedulerQueue;
};

const addWorker = () => {
  if (worker) return worker;

  worker = q.createWorker(getQueue(), async (job: Job) => {
    // Fetch secrets from vault and store in environment variables
    try {
      const secrets = await GetAllSecrets();
      for (const secret of secrets) {
        process.env[secret.secret_name] = secret.secret_value;
      }
    } catch (error) {
      console.error("Failed to sync vault secrets to environment:", error);
    }

    const activeMonitors = (await GetMonitorsParsed({ status: "ACTIVE" })).map((monitor) => ({
      ...monitor,
      hash: monitor.tag + "::" + HashString(JSON.stringify(monitor)),
    }));

    const minNumOfWorkers = Math.max(activeMonitors.length, 1);
    //get all schedulers
    const schedulers = await getSchedulers(minNumOfWorkers);

    const activeMap = new Map<string, MonitorRecordTyped>();
    for (let i = 0; i < activeMonitors.length; i++) {
      const monitor = activeMonitors[i];
      activeMap.set(monitor.hash, monitor);
    }

    //remove schedulers that are not in active monitors
    for (let i = 0; i < schedulers.length; i++) {
      const existingJob = schedulers[i];

      const matchingMonitor = activeMap.get(existingJob.name);
      if (!matchingMonitor) {
        //remove scheduler
        console.log("REMOVING INACTIVE SCHEDULER: " + existingJob.name.split("::")[0]);
        await removeJobFromSchedulerQueue(existingJob.name, minNumOfWorkers);
      }
    }

    //active job map
    const activeJobMap = new Map<string, any>();
    for (let i = 0; i < schedulers.length; i++) {
      const job = schedulers[i];
      activeJobMap.set(job.name, job);
    }

    //create schedulers for active monitors that don't have one
    for (let i = 0; i < activeMonitors.length; i++) {
      const monitor = activeMonitors[i];
      const existingJob = activeJobMap.get(monitor.hash);
      if (!existingJob && monitor.cron) {
        await addJobToSchedulerQueue(minNumOfWorkers, monitor, monitor.hash);
        console.log("ADDING NEW SCHEDULER: " + monitor.tag);
      }
    }

    return activeMonitors.length;
  });

  // worker.on("completed", (job: Job, returnvalue: any) => {
  //   console.log(`Queue: `, returnvalue);
  // });

  return worker;
};

export const start = async (options?: JobSchedulerTemplateOptions) => {
  if (!options) {
    options = {};
  }

  const queue = getQueue();
  addWorker();
  await queue.upsertJobScheduler(
    jobNamePrefix + "_main_job",
    {
      every: 10000, // Job will repeat every 10000 milliseconds (10 seconds)
    },
    {
      opts: options,
    },
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
  start,
  shutdown,
};

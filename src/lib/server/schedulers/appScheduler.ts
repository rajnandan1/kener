import type { MonitorRecordTyped } from "../types/db";

import { Queue, Worker, Job, type JobsOptions, type JobSchedulerTemplateOptions } from "bullmq";
import q from "../queues/q.js";
import { HashString } from "../tool.js";
import { getSchedulers, addJobToSchedulerQueue, removeJobFromSchedulerQueue } from "./monitorSchedulers.js";

import { GetMonitorsParsed } from "../controllers/controller.js";
import { UpdateMaintenanceEventStatuses } from "../controllers/maintenanceController.js";

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

    //we have to update the maintenances events also
    await UpdateMaintenanceEventStatuses();

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

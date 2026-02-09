import type { MonitorRecordTyped } from "../types/db";
import { Queue, Worker, Job, type JobsOptions, type JobSchedulerTemplateOptions } from "bullmq";
import q from "../queues/q.js";
import { Minuter } from "../cron-minute.js";

let monitorScheduleQueue: Queue | null = null;
let worker: Worker | null = null;
const queueName = "monitorScheduleQueue";

const getQueue = (minNumOfWorkers: number) => {
  if (!monitorScheduleQueue) {
    monitorScheduleQueue = q.createQueue(queueName);
  }
  //ensure worker is created
  addWorker(monitorScheduleQueue, minNumOfWorkers);
  return monitorScheduleQueue;
};

export const getSchedulers = async (minNumOfWorkers: number) => {
  const queue = getQueue(minNumOfWorkers);
  return await queue.getJobSchedulers();
};

const addWorker = (queue: Queue, minNumOfWorkers: number) => {
  if (worker) return worker;

  worker = q.createWorker(
    queue,
    async (job: Job) => {
      const monitor = job.data as MonitorRecordTyped;
      await Minuter(monitor);
    },
    {
      concurrency: minNumOfWorkers,
    },
  );
};

//add job to scheduler queue
export const addJobToSchedulerQueue = async (
  minNumOfWorkers: number,
  monitor: MonitorRecordTyped,
  id: string,
  options?: JobSchedulerTemplateOptions,
) => {
  if (!monitor.cron) {
    throw new Error("Monitor cron expression is undefined");
  }
  if (!options) {
    options = {};
  }
  options.removeOnComplete = {
    age: 300, // keep up to 5 minutes
    count: 100, // keep up to 100 jobs
  };
  options.removeOnFail = {
    age: 24 * 3600, // keep up to 24 hours
  };
  const queue = getQueue(minNumOfWorkers);
  await queue.upsertJobScheduler(
    id,
    {
      pattern: monitor.cron,
      immediately: true,
    },
    {
      data: monitor,
      opts: options,
    },
  );
};

//remove job from scheduler queue
export const removeJobFromSchedulerQueue = async (id: string, minNumOfWorkers: number) => {
  const queue = getQueue(minNumOfWorkers);
  await queue.removeJobScheduler(id);
};

//graceful shutdown
export const shutdown = async () => {
  if (worker) {
    await worker.close();
  }
};

export default {
  shutdown,
};

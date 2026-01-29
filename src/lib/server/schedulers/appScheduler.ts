import type { MonitorRecordTyped } from "../types/db";

import { Queue, Worker, Job, type JobsOptions, type JobSchedulerTemplateOptions } from "bullmq";
import q from "../queues/q.js";
import { InsertMonitoringData } from "../controllers/controller.js";
import { GetMinuteStartNowTimestampUTC, GetNowTimestampUTC, HashString } from "../tool.js";
import { getSchedulers, addJobToSchedulerQueue, removeJobFromSchedulerQueue } from "./monitorSchedulers.js";
import db from "../db/db.js";

import { GetMonitorsParsed } from "../controllers/controller.js";

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
    await updateMaintenanceEventStatuses();

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

/**
 * Update maintenance event statuses based on current time:
 * 1. SCHEDULED events starting within 60 minutes → READY
 * 2. READY events where current time is within start/end → ONGOING
 * 3. ONGOING events where end_date_time has passed → COMPLETED
 */
const updateMaintenanceEventStatuses = async (): Promise<void> => {
  const currentTimestamp = GetMinuteStartNowTimestampUTC();
  const sixtyMinutesInSeconds = 60 * 60;

  try {
    // 1. Mark SCHEDULED events starting within 60 minutes as READY
    const scheduledEvents = await db.getScheduledEventsStartingSoon(currentTimestamp, sixtyMinutesInSeconds);
    for (const event of scheduledEvents) {
      await db.updateMaintenanceEventStatus(event.id, "READY");
      console.log(`Maintenance event ${event.id} marked as READY (starts at ${event.start_date_time})`);
    }

    // 2. Mark READY events that are now in progress as ONGOING
    const readyEvents = await db.getReadyEventsInProgress(currentTimestamp);
    for (const event of readyEvents) {
      await db.updateMaintenanceEventStatus(event.id, "ONGOING");
      console.log(`Maintenance event ${event.id} marked as ONGOING`);
    }

    // 3. Mark ONGOING events that have ended as COMPLETED
    const ongoingEvents = await db.getOngoingEventsCompleted(currentTimestamp);
    for (const event of ongoingEvents) {
      await db.updateMaintenanceEventStatus(event.id, "COMPLETED");
      console.log(`Maintenance event ${event.id} marked as COMPLETED`);
    }
  } catch (error) {
    console.error("Error updating maintenance event statuses:", error);
  }
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

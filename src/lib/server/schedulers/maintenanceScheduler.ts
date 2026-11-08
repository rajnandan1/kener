import { Queue, Worker, Job, type JobSchedulerTemplateOptions } from "bullmq";
import q from "../queues/q.js";
import db from "../db/db.js";
import type { MaintenanceRecord } from "../types/db.js";
import { CreateMaintenanceEventWithNotification } from "../controllers/maintenanceController.js";
import { getOccurrences } from "../../maintenanceOccurrences.js";

let maintenanceSchedulerQueue: Queue | null = null;
let worker: Worker | null = null;
const queueName = "maintenanceSchedulerQueue";
const jobNamePrefix = "maintenanceSchedulerJob";
const EVENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const getQueue = () => {
  if (!maintenanceSchedulerQueue) {
    maintenanceSchedulerQueue = q.createQueue(queueName);
  }
  return maintenanceSchedulerQueue;
};

/**
 * Generate maintenance events for the next 7 days based on the RRULE
 * All dates are stored in UTC
 */
const generateEventsForMaintenance = async (maintenance: MaintenanceRecord): Promise<number> => {
  let eventsCreated = 0;

  // Skip one-time maintenances (COUNT=1) - they're handled at creation time
  if (maintenance.rrule.includes("COUNT=1")) {
    return eventsCreated;
  }

  // Define the window to generate events (now to 7 days ahead)
  const now = new Date();
  const windowEnd = new Date(now.getTime() + EVENT_WINDOW_MS);

  try {
    // Get all occurrences in the window
    const occurrences = getOccurrences(maintenance, now, { to: windowEnd });

    // Get existing events to avoid duplicates
    const existingEvents = await db.getMaintenanceEventsByMaintenanceId(maintenance.id);
    const existingStartTimes = new Set(existingEvents.map((e) => e.start_date_time));

    // Create events for each occurrence that doesn't exist
    for (const occurrence of occurrences) {
      const eventStart = Math.floor(occurrence.getTime() / 1000);
      const eventEnd = eventStart + maintenance.duration_seconds;

      // Check if event already exists for this start time
      if (!existingStartTimes.has(eventStart)) {
        await CreateMaintenanceEventWithNotification(
          maintenance.id,
          eventStart,
          eventEnd,
          maintenance.title,
          maintenance.description || null,
        );
        eventsCreated++;
        console.log(
          `Created maintenance event for "${maintenance.title}" at ${new Date(eventStart * 1000).toISOString()}`,
        );
      }
    }
  } catch (err) {
    console.error(`Error generating maintenance events for maintenance ${maintenance.id}:`, err);
  }

  return eventsCreated;
};

/**
 * Process all active recurring maintenances and generate events for the next 7 days
 */
const processAllMaintenances = async (): Promise<{ total: number; eventsCreated: number }> => {
  let totalProcessed = 0;
  let totalEventsCreated = 0;

  try {
    // Get all active maintenances
    const maintenances = await db.getMaintenancesPaginated(1, 1000, { status: "ACTIVE" });

    for (const maintenance of maintenances) {
      // Skip one-time maintenances
      if (maintenance.rrule.includes("COUNT=1")) {
        continue;
      }

      const eventsCreated = await generateEventsForMaintenance(maintenance);
      totalEventsCreated += eventsCreated;
      totalProcessed++;
    }
  } catch (err) {
    console.error("Error processing maintenances for event generation:", err);
  }

  return { total: totalProcessed, eventsCreated: totalEventsCreated };
};

const addWorker = () => {
  if (worker) return worker;

  worker = q.createWorker(getQueue(), async (job: Job) => {
    console.log("Running maintenance event scheduler...");
    const result = await processAllMaintenances();
    console.log(
      `Maintenance scheduler completed. Processed ${result.total} maintenances, created ${result.eventsCreated} events.`,
    );
    return result;
  });

  worker.on("completed", (job: Job, returnvalue: { total: number; eventsCreated: number }) => {
    if (returnvalue.eventsCreated > 0) {
      console.log(`Maintenance scheduler: Created ${returnvalue.eventsCreated} new events.`);
    }
  });

  worker.on("failed", (job: Job | undefined, err: Error) => {
    console.error("Maintenance scheduler failed:", err);
  });

  return worker;
};

/**
 * Start the maintenance scheduler
 * Runs every hour to generate events for the next 7 days
 */
export const start = async (options?: JobSchedulerTemplateOptions) => {
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
  const queue = getQueue();
  addWorker();

  // Run every hour (3600000 milliseconds)
  await queue.upsertJobScheduler(
    jobNamePrefix + "_hourly",
    {
      every: 3600000, // 1 hour in milliseconds
      immediately: true,
    },
    {
      opts: options,
    },
  );

  console.log("Maintenance event scheduler started (runs every hour)");
};

/**
 * Graceful shutdown
 */
const shutdown = async () => {
  if (worker) {
    await worker.close();
    worker = null;
  }
};

export default {
  start,
  shutdown,
};

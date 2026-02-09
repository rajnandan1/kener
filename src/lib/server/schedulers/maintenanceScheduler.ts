import { Queue, Worker, Job, type JobSchedulerTemplateOptions } from "bullmq";
import q from "../queues/q.js";
import db from "../db/db.js";
import { rrulestr } from "rrule";
import { addDays } from "date-fns";
import type { MaintenanceRecord, MaintenanceEventRecord } from "../types/db.js";

let maintenanceSchedulerQueue: Queue | null = null;
let worker: Worker | null = null;
const queueName = "maintenanceSchedulerQueue";
const jobNamePrefix = "maintenanceSchedulerJob";

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

  // Convert start timestamp to Date (UTC)
  const dtstart = new Date(maintenance.start_date_time * 1000);

  // Define the window to generate events (now to 7 days ahead)
  const now = new Date();
  const windowEnd = addDays(now, 7);

  try {
    // Build the full RRULE string with DTSTART
    const fullRrule = `DTSTART:${dtstart.toISOString().replace(/[-:]/g, "").split(".")[0]}Z\nRRULE:${maintenance.rrule}`;

    // Parse the RRULE
    const rule = rrulestr(fullRrule);

    // Get all occurrences in the window
    const occurrences = rule.between(now, windowEnd, true);

    // Get existing events to avoid duplicates
    const existingEvents = await db.getMaintenanceEventsByMaintenanceId(maintenance.id);
    const existingStartTimes = new Set(existingEvents.map((e) => e.start_date_time));

    // Create events for each occurrence that doesn't exist
    for (const occurrence of occurrences) {
      const eventStart = Math.floor(occurrence.getTime() / 1000);
      const eventEnd = eventStart + maintenance.duration_seconds;

      // Check if event already exists for this start time
      if (!existingStartTimes.has(eventStart)) {
        await db.createMaintenanceEvent({
          maintenance_id: maintenance.id,
          start_date_time: eventStart,
          end_date_time: eventEnd,
          status: "SCHEDULED",
        });
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

// @ts-nocheck

import figlet from "figlet";
import { Cron } from "croner";
import { Minuter } from "./cron-minute.js";
import db from "./db/db.js";
import { GetAllSiteData, GetMonitorsParsed } from "./controllers/controller.js";
import { HashString } from "./tool.js";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "fs";
import version from "../version.js";

const jobs = [];
process.env.TZ = "UTC";
let isStartUP = true;

// TODO: schedule maintenance reminder.
const scheduleCronJobs = async () => {
  // Fetch and map all active monitors, creating a unique hash for each
  const activeMonitors = (await GetMonitorsParsed({ status: "ACTIVE" })).map((monitor) => ({
    ...monitor,
    hash: "Tag: " + monitor.tag + " Hash:" + HashString(JSON.stringify(monitor)),
  }));

  // Remove any cron jobs that are no longer in activeMonitors
  for (let i = 0; i < jobs.length; i++) {
    const existingJob = jobs[i];
    const matchingMonitor = activeMonitors.find((m) => m.hash === existingJob.name);
    if (!matchingMonitor) {
      existingJob.stop();
      jobs.splice(i, 1);
      console.log("REMOVING JOB WITH NAME " + existingJob.name);
      i--;
    }
  }

  // Create new cron jobs for monitors that don't already have one
  for (const monitor of activeMonitors) {
    const existingJob = jobs.find((j) => j.name === monitor.hash);
    if (!existingJob) {
      const newJob = Cron(
        monitor.cron,
        async (job) => {
          await Minuter(monitor);
        },
        {
          protect: true,
          name: monitor.hash,
        },
      );
      console.log("ADDING NEW JOB WITH NAME " + newJob.name);
      if (isStartUP) {
        newJob.trigger();
      }

      jobs.push(newJob);
    }
  }

  // Fetch all active maintenance.
  const currentTime = Math.floor(Date.now() / 1000);
  const activeMaintenances = await db.getActiveMaintenanceWithReminders();
  for (const maintenance of activeMaintenances) {
    const remindersSent = maintenance.reminders_sent_at.split(";").map(Number);
    if (maintenance.reminder_time !== "0") {
      // Parse reminder_time string, e.g. "10 MINUTES", "2 HOURS", "1 DAYS"
      const [amountStr, unit] = maintenance.reminder_time.split(" ");
      const amount = parseInt(amountStr, 10);
      let minutes = 0;
      if (unit === "MINUTES") {
        minutes = amount;
      } else if (unit === "HOURS") {
        minutes = amount * 60;
      } else if (unit === "DAYS") {
        minutes = amount * 60 * 24;
      }

      // Check if the reminder for upcoming maintenance has been sent.
      const reminderTime = maintenance.start_date_time - minutes * 60;
      if (remindersSent[0] === 0 && reminderTime <= currentTime && maintenance.start_date_time > currentTime) {
        remindersSent[0] = currentTime;
        // TODO: Send the reminder notification.
      }
    }

    // Check if the reminder for ongoing maintenance has been sent.
    if (
      remindersSent[1] === 0 &&
      maintenance.start_date_time <= currentTime &&
      maintenance.end_date_time >= currentTime
    ) {
      remindersSent[1] = currentTime;
      // TODO: Send the reminder notification.
    }

    // Check if the reminder for completed maintenance has been sent.
    if (remindersSent[2] === 0 && maintenance.end_date_time <= currentTime) {
      remindersSent[2] = currentTime;
      // TODO: Send the reminder notification.
    }

    // Check if we have sent reminders.
    if (JSON.stringify(maintenance.reminders_sent_at) !== JSON.stringify(remindersSent.join(";"))) {
      await db.updateMaintenanceRemindersSentAt(maintenance.id, remindersSent.join(";"));
    }
  }

  isStartUP = false;
};

async function Startup() {
  const mainJob = Cron(
    "* * * * *",
    async () => {
      await scheduleCronJobs();
    },
    {
      protect: true,
      name: "Main Job",
    },
  );

  mainJob.trigger();

  figlet("Kener v" + version(), function (err, data) {
    if (err) {
      console.log("Something went wrong...");
      return;
    }
    console.log(data);
    console.log(`Kener version ${version()} is running!`);
  });
}

// Call Startup() if not imported as a module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv[1] === __filename) {
  Startup();
}

export default Startup;

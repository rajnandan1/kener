// @ts-nocheck

import figlet from "figlet";
import { Cron } from "croner";
import { Minuter } from "./cron-minute.js";
import db from "./db/db.js";
import { GetAllSiteData, GetMonitorsParsed, GetSiteLogoURL, SendEmailWithTemplate } from "./controllers/controller.js";
import { GetMinuteStartTimestampUTC, GetNowTimestampUTC, HashString } from "./tool.js";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import Queue from "queue";
import { join } from "path";
import fs from "fs";
import version from "../version.js";

const jobs = [];
process.env.TZ = "UTC";
let isStartUP = true;

const reminderQueue = new Queue({
  concurrency: 10,
  timeout: 10000,
  autostart: true,
});

const PushReminderToQueue = async (eventID, eventName, eventData) => {
  let subscription = await db.getSubscriptionTriggerByType("email");
  if (!subscription) return;

  let config;
  try {
    config = JSON.parse(subscription.config);
  } catch (e) {
    return;
  }
  if (!config.sendMaintenanceReminders) return;

  // Get all the monitors that are associated with this event.
  let tags = ["_"];
  let monitors = await db.getIncidentMonitorsByIncidentID(eventID);
  if (monitors) {
    for (let i = 0; i < monitors.length; i++) {
      const monitor = monitors[i];
      tags.push(monitor.monitor_tag);
    }
  }

  // Prepare email data.
  const emailTemplate = fs.readFileSync(join(__dirname, "./templates/maintenance_reminder.html"), "utf8");
  const siteData = await GetAllSiteData();
  const base = !!process.env.KENER_BASE_PATH ? process.env.KENER_BASE_PATH : "";
  let emailData = {
    brand_name: siteData.siteName,
    logo_url: await GetSiteLogoURL(siteData.siteURL, siteData.logo, base),
    incident_url: await GetSiteLogoURL(siteData.siteURL, `/view/events/maintenance-${eventID}`, base),
  };
  const eventDate = new Date(eventData.date * 1000).toISOString();

  switch (eventName) {
    case "upcoming_maintenance":
      emailData.title = `Upcoming Maintenance: ${eventData.title}`;
      emailData.message = `We would like to inform you that maintenance <b>${eventData.title}</b> is scheduled to start on ${eventDate}.`;
      emailData.message +=
        monitors.length > 0 ? ` It will affect the following services:` : ` It will not affect any services.`;
      break;
    case "starting_maintenance":
      emailData.title = `Maintenance Starting: ${eventData.title}`;
      emailData.message = `We would like to inform you that maintenance <b>${eventData.title}</b> is about to start on ${eventDate}.`;
      emailData.message +=
        monitors.length > 0 ? ` It will affect the following services:` : ` It will not affect any services.`;
      break;
    case "ending_maintenance":
      emailData.title = `Maintenance Ended: ${eventData.title}`;
      emailData.message = `We would like to inform you that maintenance <b>${eventData.title}</b> has ended on ${eventDate}.`;
      emailData.message +=
        monitors.length > 0 ? ` It affected the following services:` : ` It did not affect any services.`;
      break;
  }

  // Add monitor names to the message.
  if (monitors.length > 0) {
    emailData.message += `<div class="tags">`;
    for (const monitor of monitors) {
      emailData.message += `
      <span class="tag-container">
        <span class="tag-impact" style="background-color: ${siteData.colors[monitor.monitor_impact]}">${monitor.monitor_impact}</span>
        <span class="tag-name">${monitor.monitor_tag}</span>
      </span>
      `;
    }
    emailData.message += `</div>`;
  }

  // Get all eligible emails for the reminder.
  const eligibleEmails = await db.getSubscriberEmails(tags);
  if (eligibleEmails) {
    for (let i = 0; i < eligibleEmails.length; i++) {
      let email = eligibleEmails[i];
      reminderQueue.push(async (cb) => {
        await SendEmailWithTemplate(
          emailTemplate,
          emailData,
          email.subscriber_send,
          emailData.title,
          eventData.message,
        );
        cb(eventData);
      });
    }
  }
};

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
        PushReminderToQueue(maintenance.id, "upcoming_maintenance", {
          title: maintenance.title,
          date: GetMinuteStartTimestampUTC(reminderTime),
          message: "Maintenance is starting soon!",
        });
      }
    }

    // Check if the reminder for ongoing maintenance has been sent.
    if (
      remindersSent[1] === 0 &&
      maintenance.start_date_time <= currentTime &&
      maintenance.end_date_time >= currentTime
    ) {
      remindersSent[1] = currentTime;
      PushReminderToQueue(maintenance.id, "starting_maintenance", {
        title: maintenance.title,
        date: GetMinuteStartTimestampUTC(maintenance.start_date_time),
        message: "Maintenance is ongoing!",
      });
    }

    // Check if the reminder for completed maintenance has been sent.
    if (remindersSent[2] === 0 && maintenance.end_date_time <= currentTime) {
      remindersSent[2] = currentTime;
      PushReminderToQueue(maintenance.id, "ending_maintenance", {
        title: maintenance.title,
        date: GetMinuteStartTimestampUTC(maintenance.end_date_time),
        message: "Maintenance has ended!",
      });
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

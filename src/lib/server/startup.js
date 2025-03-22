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

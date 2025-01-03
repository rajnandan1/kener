// @ts-nocheck

import figlet from "figlet";

import { Cron } from "croner";

import { Minuter } from "./cron-minute.js";
import db from "./db/db.js";
import { GetAllSiteData, GetMonitorsParsed, HashString } from "./controllers/controller.js";
import { fileURLToPath } from "url";
import { dirname } from "path";

const jobs = [];

const jobSchedule = async () => {
	const activeMonitors = (await GetMonitorsParsed({ status: "ACTIVE" })).map((m) => {
		return {
			...m,
			hash: "Tag: " + m.tag + " Hash:" + HashString(JSON.stringify(m))
		};
	});

	//stop and remove jobs not present in activeMonitors
	for (let i = 0; i < jobs.length; i++) {
		const job = jobs[i];
		const monitor = activeMonitors.find((m) => m.hash === job.name);
		if (!monitor) {
			job.stop();
			jobs.splice(i, 1);
			i--;
			console.log("REMOVING JOB WITH NAME " + job.name);
		}
	}

	//add new jobs from activeMonitors if not present already in jobs
	for (let i = 0; i < activeMonitors.length; i++) {
		const monitor = activeMonitors[i];
		const job = jobs.find((j) => j.name === monitor.hash);
		if (!job) {
			const j = Cron(
				monitor.cron,
				async () => {
					await Minuter(monitor);
				},
				{
					protect: true,
					name: monitor.hash
				}
			);
			console.log("ADDING NEW JOB WITH NAME " + j.name);
			j.trigger();
			jobs.push(j);
		}
	}
};

async function Startup() {
	const mainJob = Cron(
		"* * * * *",
		async () => {
			await jobSchedule();
		},
		{
			protect: true,
			name: "Main Job"
		}
	);

	mainJob.trigger();

	figlet("Kener is UP!", function (err, data) {
		if (err) {
			console.log("Something went wrong...");
			return;
		}
		console.log(data);
	});
}

// Call Startup() if not imported as a module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv[1] === __filename) {
	Startup();
}

export default Startup;

// @ts-nocheck

import * as dotenv from "dotenv";
import fs from "fs-extra";
import path from "path";
import figlet from "figlet";

import yaml from "js-yaml";
import { Cron } from "croner";
import { API_TIMEOUT } from "./constants.js";

import { Minuter } from "./cron-minute.js";
import axios from "axios";
import db from "./db/db.js";
import Queue from "queue";
import { GetAllSiteData, GetMonitorsParsed, HashString } from "./controllers/controller.js";

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
			jobs.push(j);
		}
	}
};

async function Startup() {
	const activeMonitors = await GetMonitorsParsed({ status: "ACTIVE" });
	for (let i = 0; i < activeMonitors.length; i++) {
		let m = activeMonitors[i];
		await Minuter(m);
	}
	await jobSchedule();
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

	figlet("Kener is UP!", function (err, data) {
		if (err) {
			console.log("Something went wrong...");
			return;
		}
		console.log(data);
	});
}
Startup();

// console.log(">>>>>>----  startup:96 ", mainJob.name);

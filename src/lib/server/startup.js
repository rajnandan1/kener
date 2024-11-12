// @ts-nocheck
/*
The startup js script will
check if monitors.yaml exists
if it does, it will read the file and parse it into a json array of objects
each objects will have a name, url, method: required
name of each of these objects need to be unique
*/
import * as dotenv from "dotenv";
import fs from "fs-extra";
import path from "path";

import yaml from "js-yaml";
import { Cron } from "croner";
import { API_TIMEOUT } from "$lib/server/constants.js";
import siteDataRaw from "$lib/server/config/site.yaml?raw";
import monitorDataRaw from "$lib/server/config/monitors.yaml?raw";

import { IsValidURL, IsValidHTTPMethod, ValidateIpAddress } from "$lib/server/tool.js";
import { GetAllGHLabels, CreateGHLabel } from "$lib/server/github.js";
import { Minuter } from "$lib/server/cron-minute.js";
import axios from "axios";
import { Ninety } from "$lib/server/ninety.js";
let monitors = [];
let site = {};
const envSecrets = [];
const DATABASE_PATH = "./database";

const Startup = async () => {
	const FOLDER_MONITOR_JSON = DATABASE_PATH + "/monitors.json";
	const monitors = fs.readJSONSync(FOLDER_MONITOR_JSON);
	const site = fs.readJSONSync(DATABASE_PATH + "/site.json");
	// init monitors
	for (let i = 0; i < monitors.length; i++) {
		const monitor = monitors[i];
		if (!fs.existsSync(monitor.path0Day)) {
			fs.ensureFileSync(monitor.path0Day);
			fs.writeFileSync(monitor.path0Day, JSON.stringify({}));
		}
		if (!fs.existsSync(monitor.path90Day)) {
			fs.ensureFileSync(monitor.path90Day);
			fs.writeFileSync(monitor.path90Day, JSON.stringify({}));
		}

		console.log("Initial Fetch for ", monitor.name);
		await Minuter(envSecrets, monitor, site.github);
		await Ninety(monitor);
	}
	//trigger minute cron

	for (let i = 0; i < monitors.length; i++) {
		const monitor = monitors[i];

		let cronExpression = "* * * * *";
		if (monitor.cron !== undefined && monitor.cron !== null) {
			cronExpression = monitor.cron;
		}
		console.log("Staring " + cronExpression + " Cron for ", monitor.name);
		Cron(cronExpression, async () => {
			await Minuter(envSecrets, monitor, site.github);
		});
	}

	//pre compute 90 day data at 1 minute interval
	Cron(
		"* * * * *",
		async () => {
			for (let i = 0; i < monitors.length; i++) {
				const monitor = monitors[i];
				Ninety(monitor);
			}
		},
		{
			protect: true
		}
	);

	return 1;
};

Startup();

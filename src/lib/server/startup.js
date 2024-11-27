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
import { API_TIMEOUT } from "./constants.js";

import { IsValidURL, IsValidHTTPMethod, ValidateIpAddress } from "./tool.js";

import { Minuter } from "./cron-minute.js";
import axios from "axios";
import db from "./db/db.js";
let monitors = [];
let site = {};
const DATABASE_PATH = "./database";
const Startup = async () => {
	const monitors = fs.readJSONSync(DATABASE_PATH + "/monitors.json");
	const site = fs.readJSONSync(DATABASE_PATH + "/site.json");
	// init monitors
	for (let i = 0; i < monitors.length; i++) {
		const monitor = monitors[i];
		console.log("Initial Fetch for ", monitor.name);
		await Minuter(monitor, site.github, site);
	}

	for (let i = 0; i < monitors.length; i++) {
		const monitor = monitors[i];

		let cronExpression = "* * * * *";
		if (monitor.cron !== undefined && monitor.cron !== null) {
			cronExpression = monitor.cron;
		}
		console.log("Staring " + cronExpression + " Cron for ", monitor.name);
		Cron(cronExpression, async () => {
			await Minuter(monitor, site.github, site);
		});
	}
	Cron(
		"* * * * *",
		async () => {
			db.background();
		},
		{
			protect: true
		}
	);
	return 1;
};

Startup();

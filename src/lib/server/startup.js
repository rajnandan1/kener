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
import figlet from "figlet";

import yaml from "js-yaml";
import { Cron } from "croner";
import { API_TIMEOUT } from "./constants.js";

import { IsValidURL, IsValidHTTPMethod, ValidateIpAddress, ValidateMonitorAlerts } from "./tool.js";

import { Minuter } from "./cron-minute.js";
import axios from "axios";
import db from "./db/db.js";
import Queue from "queue";

const DATABASE_PATH = "./database";
const Startup = async () => {
	const monitors = fs.readJSONSync(DATABASE_PATH + "/monitors.json");
	const site = fs.readJSONSync(DATABASE_PATH + "/site.json");
	const startUPLog = {};
	// init monitors
	for (let i = 0; i < monitors.length; i++) {
		const monitor = monitors[i];
		await Minuter(monitor, site);
		startUPLog[monitor.name] = {
			"Initial Fetch": "✅"
		};
	}

	for (let i = 0; i < monitors.length; i++) {
		const monitor = monitors[i];

		let cronExpression = "* * * * *";
		if (monitor.cron !== undefined && monitor.cron !== null) {
			cronExpression = monitor.cron;
		}
		Cron(cronExpression, async () => {
			await Minuter(monitor, site);
		});
		startUPLog[monitor.name]["Monitoring At"] = cronExpression;
		if (monitor.alerts && ValidateMonitorAlerts(monitor.alerts)) {
			startUPLog[monitor.name]["Alerting"] = "✅";
		} else {
			startUPLog[monitor.name]["Alerting"] = "❗";
		}
	}
	const tableData = Object.entries(startUPLog).map(([name, details]) => ({
		Monitor: name,
		...details
	}));

	console.table(tableData);
	Cron(
		"* * * * *",
		async () => {
			await db.background();
		},
		{
			protect: true
		}
	);

	figlet("Kener is UP!", function (err, data) {
		if (err) {
			console.log("Something went wrong...");
			return;
		}
		console.log(data);
	});
	return 1;
};

Startup();

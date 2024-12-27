import fs from "fs-extra";
import path from "path";
import db from "./src/lib/server/db/db.js";

let maxWait = 5000;
let interval = 1000;
let waitTime = 0;
let serverDataPath = path.join(process.cwd(), "database", "server.json");
let siteDataPath = path.join(process.cwd(), "database", "site.json");
let monitorsDataPath = path.join(process.cwd(), "database", "monitors.json");

async function allFilesExist() {
	let tablesCreated = (await db.checkTables()).map((table) => table.name);
	let tablesRequired = ["MonitoringData", "MonitorAlerts", "SiteData", "Monitors", "Alerts"];

	for (let table of tablesRequired) {
		let tableExists = tablesCreated.includes(table);
		if (!tableExists) {
			return false;
		}
	}
	return true;
}

//use setTimeout to create a delay promise
function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

let requiredFilesExist = false;

//create anonymous function to call the init function
(async function init() {
	while (!requiredFilesExist && waitTime < maxWait) {
		await delay(1000);
		requiredFilesExist = await allFilesExist();

		waitTime += interval;
	}
	if (!requiredFilesExist) {
		console.error("Error loading site data");
		process.exit(1);
	} else {
		console.log("✅ All files exist. Starting Frontend server...");
	}
})();

import db from "./src/lib/server/db/db.js";

let maxWait = 5000;
let interval = 1000;
let waitTime = 0;

async function allFilesExist() {
	let tablesCreated = (await db.checkTables()).map((table) => table.name);
	let tablesRequired = [
		"MonitoringData",
		"MonitorAlerts",
		"SiteData",
		"Monitors",
		"Triggers",
		"Users",
		"ApiKeys"
	];

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

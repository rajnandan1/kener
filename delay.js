import fs from "fs-extra";
import path from "path";

let maxWait = 5000;
let interval = 1000;
let waitTime = 0;
let serverDataPath = path.join(process.cwd(), "database", "server.json");
let siteDataPath = path.join(process.cwd(), "database", "site.json");
let monitorsDataPath = path.join(process.cwd(), "database", "monitors.json");

function allFilesExist() {
	return (
		fs.existsSync(serverDataPath) &&
		fs.existsSync(siteDataPath) &&
		fs.existsSync(monitorsDataPath)
	);
}

//use setTimeout to create a delay promise
function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

let requiredFilesExist = allFilesExist();

//create anonymous function to call the init function
(async function init() {
	while (!requiredFilesExist && waitTime < maxWait) {
		await delay(1000);
		requiredFilesExist = allFilesExist();

		waitTime += interval;
	}
	if (!requiredFilesExist) {
		console.error("Error loading site data");
		process.exit(1);
	} else {
		console.log("✅ All files exist. Starting Frontend server...");
	}
})();

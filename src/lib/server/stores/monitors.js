import { readable } from "svelte/store";
import fs from "fs-extra";
import path from "path";

// Load the JSON data from the file system
let monitorsData = {};
try {
	const monitorsDataPath = path.join(process.cwd(), "database", "monitors.json");
	monitorsData = fs.readJSONSync(monitorsDataPath, "utf8");
} catch (error) {}
// Create a readonly store
export const monitorsStore = readable(monitorsData, () => {});

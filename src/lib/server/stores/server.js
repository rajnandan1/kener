// @ts-nocheck
import { readable } from "svelte/store";
import fs from "fs-extra";
import path from "path";

// Load the JSON data from the file system
let serverData = {};
try {
	const serverDataPath = path.join(process.cwd(), "database", "server.json");
	serverData = fs.readJSONSync(serverDataPath, "utf8");
} catch (error) {
	console.error("Error loading site data", error);
}
// Create a readonly store
export const serverStore = readable(serverData, () => {});

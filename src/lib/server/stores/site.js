import { readable } from "svelte/store";
import fs from "fs-extra";
import path from "path";

// Load the JSON data from the file system
let siteData = {};
try {
	const siteDataPath = path.join(process.cwd(), "database", "site.json");
	siteData = fs.readJSONSync(siteDataPath, "utf8");
} catch (error) {}
// Create a readonly store
export const siteStore = readable(siteData, () => {});

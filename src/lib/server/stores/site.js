import { readable } from "svelte/store";
import fs from "fs-extra";
import path from "path";

// Load the JSON data from the file system
const siteDataPath = path.join(process.cwd(), "database", "site.json");
const siteData = fs.readJSONSync(siteDataPath, "utf8");
// Create a readonly store
export const siteStore = readable(siteData, () => {});


// Define your constants
const FOLDER = process.env.PUBLIC_KENER_FOLDER;
const ENV = process.env.NODE_ENV;
const MONITOR = "./config/monitors.yaml";
const SITE = "./config/site.yaml";
const FOLDER_MONITOR = FOLDER + "/monitors.json";
const FOLDER_SITE = FOLDER + "/site.json";
const UP = "UP";
const DOWN = "DOWN";
const DEGRADED = "DEGRADED";
const APP_HTML = "./src/app.html";
const API_TIMEOUT = 10 * 1000; // 10 seconds
// Export the constants
export { FOLDER, FOLDER_MONITOR, FOLDER_SITE, MONITOR, UP, DOWN, APP_HTML, SITE, DEGRADED, API_TIMEOUT, ENV };

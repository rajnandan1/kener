// @ts-nocheck
// Define your constants
import dotenv from "dotenv";
dotenv.config();
const ENV = process.env.NODE_ENV;
const MONITOR = "./config/monitors.yaml";
const SITE = "./config/site.yaml";
const UP = "UP";
const DOWN = "DOWN";
const DEGRADED = "DEGRADED";
const API_TIMEOUT = 10 * 1000; // 10 seconds
// Export the constants
export { MONITOR, UP, DOWN, SITE, DEGRADED, API_TIMEOUT, ENV };

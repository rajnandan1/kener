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
const AnalyticsProviders = {
	GA: "https://unpkg.com/@analytics/google-analytics@1.0.7/dist/@analytics/google-analytics.min.js",
	AMPLITUDE: "https://unpkg.com/@analytics/amplitude@0.1.3/dist/@analytics/amplitude.min.js",
	MIXPANEL: "https://unpkg.com/@analytics/mixpanel@0.4.0/dist/@analytics/mixpanel.min.js"
};
// Export the constants
export { MONITOR, UP, DOWN, SITE, DEGRADED, API_TIMEOUT, ENV, AnalyticsProviders };

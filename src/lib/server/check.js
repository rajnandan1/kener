// @ts-nocheck
import { ENV } from "$lib/server/constants.js";
import { IsStringURLSafe } from "$lib/server/tool.js";
import dotenv from "dotenv";
dotenv.config();
import fs from "fs-extra";
let STATUS_OK = false;

if (ENV === undefined) {
	console.log(`❗ process.env.NODE_ENV is not set. Defaulting to development`);
} else {
	console.log(`✅ process.env.NODE_ENV is set. Value is ${ENV}`);
}
if (process.env.GH_TOKEN === undefined) {
	console.log(
		`❗ GH_TOKEN is not set. Go to https://kener.ing/docs#h2github-setup to learn how to set it up`
	);
} else {
	console.log(`✅ GH_TOKEN is set`);
}

if (process.env.API_TOKEN === undefined) {
	console.log(
		`❗ API_TOKEN is not set. Go to https://kener.ing/docs#h2environment-variable to learn how to set it up`
	);
} else {
	console.log(`✅ API_TOKEN is set`);
}
if (process.env.API_IP === undefined) {
	console.log(
		`❗ API_IP is not set. Go to https://kener.ing/docs#h2environment-variable to learn how to set it up`
	);
} else {
	console.log(`✅ API_IP is set`);
}
if (process.env.MONITOR_YAML_PATH === undefined) {
	console.log(
		`❗ MONITOR_YAML_PATH is not set. Go to https://kener.ing/docs#h2environment-variable to learn how to set it up. Defaulting to config/monitors.yaml`
	);
} else {
	console.log(`✅ MONITOR_YAML_PATH is set`);
}
if (process.env.SITE_YAML_PATH === undefined) {
	console.log(
		`❗ SITE_YAML_PATH is not set. Go to https://kener.ing/docs#h2environment-variable to learn how to set it up. Defaulting to config/site.yaml`
	);
} else {
	console.log(`✅ SITE_YAML_PATH is set`);
}
if (process.env.PORT === undefined) {
	console.log(`❗ PORT is not set. Defaulting to 3000`);
} else {
	console.log(`✅ PORT is set. Value is ${process.env.PORT}`);
}

if (process.env.KENER_BASE_PATH !== undefined) {
	if (process.env.KENER_BASE_PATH[0] !== "/") {
		console.log("❌ KENER_BASE_PATH should start with /");
		process.exit(1);
	}
	if (process.env.KENER_BASE_PATH[process.env.KENER_BASE_PATH.length - 1] === "/") {
		console.log("❌ KENER_BASE_PATH should not end with /");
		process.exit(1);
	}
	if (!IsStringURLSafe(process.env.KENER_BASE_PATH.substr(1))) {
		console.log("❌ KENER_BASE_PATH is not url safe");
		process.exit(1);
	}
}

STATUS_OK = true;
export { STATUS_OK };

import { FOLDER, FOLDER_MONITOR, FOLDER_SITE, ENV } from "./constants.js";
import fs from "fs-extra";
let STATUS_OK = false;
if (!!process.env.PUBLIC_KENER_FOLDER) {
    console.log(`✅ PUBLIC_KENER_FOLDER is  ${process.env.PUBLIC_KENER_FOLDER}`);
} else {
	console.log(`❌ process.env.PUBLIC_KENER_FOLDER is not set
Set PUBLIC_KENER_FOLDER as an environment variable. Value should be the path to a directory where kener will store its data.
Example:
export PUBLIC_KENER_FOLDER=${process.cwd()}/static/kener`
);
    process.exit(1);
}

if (!fs.existsSync(FOLDER)) {
    console.log(`❌ Directory does not exist\n\nRun:\nmkdir -p ${FOLDER}`);
	process.exit(1);
}


if (!fs.existsSync(FOLDER_SITE)) {
    fs.writeFileSync(FOLDER_SITE, JSON.stringify({}));
    console.log("✅ site.json file created successfully!");
}

if (!fs.existsSync(FOLDER_MONITOR)) {
    fs.writeFileSync(FOLDER_MONITOR, JSON.stringify([]));
    console.log("✅ monitors.json file created successfully!");
}

if (ENV === undefined) {
	console.log(`❗ process.env.NODE_ENV is not set`);
} else {
	console.log(`✅ process.env.NODE_ENV is set. Value is ${ENV}`);
}
if(process.env.GH_TOKEN === undefined) {
	console.log(`❗ GH_TOKEN is not set. Go to https://kener.ing/docs#h2github-setup to learn how to set it up`);
} else {
	console.log(`✅ GH_TOKEN is set`);
}

if(process.env.API_TOKEN === undefined) {
	console.log(`❗ API_TOKEN is not set. Go to https://kener.ing/docs#h2environment-variable to learn how to set it up`);
} else {
	console.log(`✅ API_TOKEN is set`);
}
if (process.env.API_IP === undefined) {
    console.log(`❗ API_IP is not set. Go to https://kener.ing/docs#h2environment-variable to learn how to set it up`);
} else {
    console.log(`✅ API_IP is set`);
}
if (process.env.MONITOR_YAML_PATH === undefined) {
	console.log(`❗ MONITOR_YAML_PATH is not set. Go to https://kener.ing/docs#h2environment-variable to learn how to set it up. Defaulting to config/monitors.yaml`);
} else {
	console.log(`✅ MONITOR_YAML_PATH is set`);
}
if (process.env.SITE_YAML_PATH === undefined) {
    console.log(`❗ SITE_YAML_PATH is not set. Go to https://kener.ing/docs#h2environment-variable to learn how to set it up. Defaulting to config/site.yaml`);
} else {
    console.log(`✅ SITE_YAML_PATH is set`);
}
if (process.env.PORT === undefined) {
    console.log(`❗ PORT is not set. Defaulting to 3000`);
} else {
    console.log(`✅ PORT is set. Value is ${process.env.PORT}`);
}

STATUS_OK = true;
export { STATUS_OK };

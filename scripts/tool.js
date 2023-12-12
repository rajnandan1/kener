import { MONITOR, SITE} from "./constants.js";

const IsValidURL = function (url) {
    return /^(http|https):\/\/[^ "]+$/.test(url);
};
const IsValidHTTPMethod = function (method) {
    return /^(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH)$/.test(method);
};
const LoadMonitorsPath = function () {
    const argv = process.argv;

    if (!!process.env.MONITOR_YAML_PATH) {
        return process.env.MONITOR_YAML_PATH;
    }

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === "--monitors") {
            return argv[i + 1];
        }
    }

	return MONITOR;
};
const LoadSitePath = function () {
    const argv = process.argv;

    if (!!process.env.SITE_YAML_PATH) {
        return process.env.SITE_YAML_PATH;
    }

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === "--site") {
            return argv[i + 1];
        }
    }

	return SITE;
};
export { IsValidURL, IsValidHTTPMethod, LoadMonitorsPath, LoadSitePath };

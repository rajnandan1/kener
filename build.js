import yaml from "js-yaml";
import fs from "fs-extra";
import axios from "axios";
import {
	IsValidURL,
	checkIfDuplicateExists,
	getWordsStartingWithDollar,
	IsValidHTTPMethod,
	ValidateIpAddress
} from "./src/lib/server/tool.js";
import { API_TIMEOUT, AnalyticsProviders } from "./src/lib/server/constants.js";

const configPathFolder = "./config";
const databaseFolder = process.argv[2] || "./database";
const defaultEval = `(function (statusCode, responseTime, responseData) {
	let statusCodeShort = Math.floor(statusCode/100);
    if(statusCode == 429 || (statusCodeShort >=2 && statusCodeShort <= 3)) {
        return {
			status: 'UP',
			latency: responseTime,
        }
    } 
	return {
		status: 'DOWN',
		latency: responseTime,
	}
})`;
async function Build() {
	console.log("Building Kener...");
	let site = {};
	let monitors = [];
	try {
		site = yaml.load(fs.readFileSync(configPathFolder + "/site.yaml", "utf8"));
		monitors = yaml.load(fs.readFileSync(configPathFolder + "/monitors.yaml", "utf8"));
	} catch (error) {
		console.log(error);
		process.exit(1);
	}

	if (
		site.github === undefined ||
		site.github.owner === undefined ||
		site.github.repo === undefined
	) {
		console.log("github owner and repo are required");
		process.exit(1);
	}

	const FOLDER_DB = databaseFolder;
	const FOLDER_SITE = FOLDER_DB + "/site.json";
	const FOLDER_MONITOR = FOLDER_DB + "/monitors.json";

	for (let i = 0; i < monitors.length; i++) {
		const monitor = monitors[i];

		let name = monitor.name;
		let tag = monitor.tag;
		let hasAPI = monitor.api !== undefined && monitor.api !== null;
		let hasPing = monitor.ping !== undefined && monitor.ping !== null;
		let folderName = name.replace(/[^a-z0-9]/gi, "-").toLowerCase();
		monitors[i].folderName = folderName;

		if (!name || !tag) {
			console.log("name, tag are required");
			process.exit(1);
		}

		if (
			monitor.dayDegradedMinimumCount &&
			(isNaN(monitor.dayDegradedMinimumCount) || monitor.dayDegradedMinimumCount < 1)
		) {
			console.log("dayDegradedMinimumCount is not a number or it is less than 1");
			process.exit(1);
		} else if (monitor.dayDegradedMinimumCount === undefined) {
			monitors[i].dayDegradedMinimumCount = 1;
		}

		if (
			monitor.dayDownMinimumCount &&
			(isNaN(monitor.dayDownMinimumCount) || monitor.dayDownMinimumCount < 1)
		) {
			console.log("dayDownMinimumCount is not a number or it is less than 1");
			process.exit(1);
		} else if (monitor.dayDownMinimumCount === undefined) {
			monitors[i].dayDownMinimumCount = 1;
		}

		if (
			monitor.includeDegradedInDowntime === undefined ||
			monitor.includeDegradedInDowntime !== true
		) {
			monitors[i].includeDegradedInDowntime = false;
		}
		if (hasPing) {
			let hostsV4 = monitor.ping.hostsV4;
			let hostsV6 = monitor.ping.hostsV6;
			let hasV4 = false;
			let hasV6 = false;
			if (hostsV4 && Array.isArray(hostsV4) && hostsV4.length > 0) {
				hostsV4.forEach((host) => {
					if (ValidateIpAddress(host) == "Invalid") {
						console.log(`hostsV4 ${host} is not valid`);
						process.exit(1);
					}
				});
				hasV4 = true;
			}
			if (hostsV6 && Array.isArray(hostsV6) && hostsV6.length > 0) {
				hostsV6.forEach((host) => {
					if (ValidateIpAddress(host) == "Invalid") {
						console.log(`hostsV6 ${host} is not valid`);
						process.exit(1);
					}
				});
				hasV6 = true;
			}

			if (!hasV4 && !hasV6) {
				console.log("hostsV4 or hostsV6 is required");
				process.exit(1);
			}
			monitors[i].hasPing = true;
		}
		if (hasAPI) {
			let url = monitor.api.url;
			let method = monitor.api.method;
			let headers = monitor.api.headers;
			let evaluator = monitor.api.eval;
			let body = monitor.api.body;
			let timeout = monitor.api.timeout;
			let hideURLForGet = !!monitor.api.hideURLForGet;
			//url
			if (!!url) {
				if (!IsValidURL(url)) {
					console.log("url is not valid");
					process.exit(1);
				}
			}
			if (!!method) {
				if (!IsValidHTTPMethod(method)) {
					console.log("method is not valid");
					process.exit(1);
				}
				method = method.toUpperCase();
			} else {
				method = "GET";
			}
			monitors[i].api.method = method;
			//headers
			if (headers === undefined || headers === null) {
				monitors[i].api.headers = undefined;
			} else {
				//check if headers is a valid json
				try {
					JSON.parse(JSON.stringify(headers));
				} catch (error) {
					console.log("headers are not valid. Quitting");
					process.exit(1);
				}
			}
			//eval
			if (evaluator === undefined || evaluator === null) {
				monitors[i].api.eval = defaultEval;
			} else {
				let evalResp = eval(evaluator + `(200, 1000, "e30=")`);

				if (
					evalResp === undefined ||
					evalResp === null ||
					evalResp.status === undefined ||
					evalResp.status === null ||
					evalResp.latency === undefined ||
					evalResp.latency === null
				) {
					console.log("eval is not valid ");
					process.exit(1);
				}
				monitors[i].api.eval = evaluator;
			}
			//body
			if (body === undefined || body === null) {
				monitors[i].api.body = undefined;
			} else {
				//check if body is a valid string
				if (typeof body !== "string") {
					console.log("body is not valid should be a string");
					process.exit(1);
				}
			}
			//timeout
			if (timeout === undefined || timeout === null) {
				monitors[i].api.timeout = API_TIMEOUT;
			} else {
				//check if timeout is a valid number
				if (isNaN(timeout) || timeout < 0) {
					console.log("timeout is not valid ");
					process.exit(1);
				}
			}

			//add a description to the monitor if it is website using api.url and method = GET and headers == undefined
			//call the it to see if received content-type is text/html
			//if yes, append to description
			if (
				!hideURLForGet &&
				(headers === undefined || headers === null) &&
				url !== undefined &&
				method === "GET"
			) {
				try {
					const response = await axios({
						method: "GET",
						url: url,
						timeout: API_TIMEOUT
					});
					if (response.headers["content-type"].includes("text/html")) {
						let link = `<a href="${url}" class="font-medium underline underline-offset-4" target="_blank">${url}</a>`;
						if (monitors[i].description === undefined) {
							monitors[i].description = link;
						} else {
							monitors[i].description = monitors[i].description?.trim() + " " + link;
						}
					}
				} catch (error) {
					console.log(error);
				}
			}
		}

		monitors[i].path0Day = `${FOLDER_DB}/${folderName}.0day.utc.json`;
		monitors[i].path90Day = `${FOLDER_DB}/${folderName}.90day.utc.json`;
		monitors[i].hasAPI = hasAPI;

		//secrets can be in url/body/headers
		//match in monitor.url if a words starts with $, get the word
		const requiredSecrets = getWordsStartingWithDollar(
			`${monitor.url} ${monitor.body} ${JSON.stringify(monitor.headers)}`
		).map((x) => x.substr(1));

		//iterate over process.env
		for (const [key, value] of Object.entries(process.env)) {
			if (requiredSecrets.indexOf(key) !== -1) {
				envSecrets.push({
					find: `$${key}`,
					replace: value
				});
			}
		}
	}

	if (site.github.incidentSince === undefined || site.github.incidentSince === null) {
		site.github.incidentSince = 720;
	}
	if (site.siteName === undefined) {
		site.siteName = site.title;
	}
	if (site.theme === undefined) {
		site.theme = "system";
	}
	if (site.themeToggle === undefined) {
		site.themeToggle = true;
	}
	if (!!site.analytics) {
		const providers = {};

		for (let i = 0; i < site.analytics.length; i++) {
			const element = site.analytics[i];
			if (!!AnalyticsProviders[element.type]) {
				if (providers[element.type] === undefined) {
					providers[element.type] = {};
					providers[element.type].measurementIds = [];
					providers[element.type].script = AnalyticsProviders[element.type];
				}
				providers[element.type].measurementIds.push(element.id);
			}
		}
		site.analytics = providers;
	}
	if (!!!site.font || !!!site.font.cssSrc || !!!site.font.family) {
		site.font = {
			cssSrc: "https://fonts.googleapis.com/css2?family=Albert+Sans:ital,wght@0,100..900;1,100..900&display=swap",
			family: "Albert Sans"
		};
	}
	if (checkIfDuplicateExists(monitors.map((monitor) => monitor.folderName)) === true) {
		console.log("duplicate monitor detected");
		process.exit(1);
	}
	if (checkIfDuplicateExists(monitors.map((monitor) => monitor.tag)) === true) {
		console.log("duplicate tag detected");
		process.exit(1);
	}

	fs.ensureFileSync(FOLDER_MONITOR);
	fs.ensureFileSync(FOLDER_SITE);

	try {
		fs.writeFileSync(FOLDER_MONITOR, JSON.stringify(monitors, null, 4));
		fs.writeFileSync(FOLDER_SITE, JSON.stringify(site, null, 4));
	} catch (error) {
		console.log(error);
		process.exit(1);
	}
}

Build();

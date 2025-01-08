import yaml from "js-yaml";
import fs from "fs-extra";
import axios from "axios";
import {
	IsValidURL,
	checkIfDuplicateExists,
	IsValidHTTPMethod,
	ValidateIpAddress,
	IsValidHost,
	IsValidRecordType,
	IsValidNameServer
} from "./src/lib/server/tool.js";
import { API_TIMEOUT, AnalyticsProviders } from "./src/lib/server/constants.js";
import { GetAllGHLabels, CreateGHLabel } from "./src/lib/server/github.js";

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

function validateServerFile(server) {
	//if empty return true
	if (Object.keys(server).length === 0) {
		return true;
	}
	//server.triggers is present then it should be an array
	if (server.triggers !== undefined && !Array.isArray(server.triggers)) {
		console.log("triggers should be an array");
		return false;
	}
	///each trigger should have a name, type, and url
	if (server.triggers !== undefined) {
		for (let i = 0; i < server.triggers.length; i++) {
			const trigger = server.triggers[i];
			if (
				trigger.name === undefined ||
				trigger.type === undefined ||
				trigger.url === undefined
			) {
				console.log("trigger should have name, type, and url");
				return false;
			}
		}
	}
	//if database is present then it should be an object, and they key can be either postgres or sqlite
	if (server.database !== undefined && typeof server.database !== "object") {
		console.log("database should be an object");
		return false;
	}
	if (server.database !== undefined) {
		let dbtype = Object.keys(server.database);
		if (dbtype.length !== 1) {
			console.log("database should have only one key");
			return false;
		}
		if (dbtype[0] !== "postgres" && dbtype[0] !== "sqlite") {
			console.log("database should be either postgres or sqlite");
			return false;
		}
	}

	return true;
}

async function Build() {
	console.log("ℹ️ Building Kener...");
	let site = {};
	let server = {};
	let monitors = [];
	try {
		site = yaml.load(fs.readFileSync(configPathFolder + "/site.yaml", "utf8"));
		monitors = yaml.load(fs.readFileSync(configPathFolder + "/monitors.yaml", "utf8"));
	} catch (error) {
		console.log(error);
		process.exit(1);
	}
	try {
		server = yaml.load(fs.readFileSync(configPathFolder + "/server.yaml", "utf8"));
		if (!validateServerFile(server)) {
			process.exit(1);
		}
	} catch (error) {
		console.warn("server.yaml not found");
		server = {};
	}

	if (
		site.github === undefined ||
		site.github.owner === undefined ||
		site.github.repo === undefined
	) {
		console.log("github owner and repo are required");
		site.hasGithub = false;
		// process.exit(1);
	} else {
		site.hasGithub = true;
	}

	if (site.hasGithub && !!!site.github.incidentSince) {
		site.github.incidentSince = 720;
	}
	if (site.hasGithub && !!!site.github.apiURL) {
		site.github.apiURL = "https://api.github.com";
	}

	const FOLDER_DB = databaseFolder;
	const FOLDER_SITE = FOLDER_DB + "/site.json";
	const FOLDER_MONITOR = FOLDER_DB + "/monitors.json";
	const FOLDER_SERVER = FOLDER_DB + "/server.json";

	for (let i = 0; i < monitors.length; i++) {
		const monitor = monitors[i];

		let name = monitor.name;
		let tag = monitor.tag;
		let hasAPI = monitor.api !== undefined && monitor.api !== null;
		let hasPing = monitor.ping !== undefined && monitor.ping !== null;
		let hasDNS = monitor.dns !== undefined && monitor.dns !== null;
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
		if (hasDNS) {
			let dnsData = monitor.dns;
			let domain = dnsData.host;
			//check if domain is valid
			if (!!!domain || !IsValidHost(domain)) {
				console.log("domain is not valid");
				process.exit(1);
			}

			let recordType = dnsData.lookupRecord;
			//check if recordType is valid
			if (!!!recordType || !IsValidRecordType(recordType)) {
				console.log("recordType is not valid");
				process.exit(1);
			}

			let nameServer = dnsData.nameServer;
			//check if nameserver is valid
			if (!!nameServer && !IsValidNameServer(nameServer)) {
				console.log("nameServer is not valid");
				process.exit(1);
			}

			// matchType: "ANY" # ANY, ALL
			let matchType = dnsData.matchType;
			if (!!!matchType || (matchType !== "ANY" && matchType !== "ALL")) {
				console.log("matchType is not valid");
				process.exit(1);
			}

			//values array of string at least one
			let values = dnsData.values;
			if (!!!values || !Array.isArray(values) || values.length === 0) {
				console.log("values is not valid");
				process.exit(1);
			}
			monitors[i].hasDNS = true;
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
					console.log(`error while fetching ${url}`);
				}
			}
		}

		monitors[i].hasAPI = hasAPI;
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
	if (site.barStyle === undefined) {
		site.barStyle = "FULL";
	}
	if (site.barRoundness === undefined) {
		site.barRoundness = "ROUNDED";
	} else {
		site.barRoundness = site.barRoundness.toLowerCase();
	}
	if (site.summaryStyle === undefined) {
		site.summaryStyle = "DAY";
	}
	site.colors = {
		UP: site.colors?.UP || "#4ead94",
		DOWN: site.colors?.DOWN || "#ca3038",
		DEGRADED: site.colors?.DEGRADED || "#e6ca61"
	};
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
	fs.ensureFileSync(FOLDER_SERVER);
	try {
		fs.writeFileSync(FOLDER_MONITOR, JSON.stringify(monitors, null, 4));
		fs.writeFileSync(FOLDER_SITE, JSON.stringify(site, null, 4));
		fs.writeFileSync(FOLDER_SERVER, JSON.stringify(server, null, 4));
	} catch (error) {
		console.log(error);
		process.exit(1);
	}

	console.log("✅ Kener built successfully");

	if (site.hasGithub) {
		const ghLabels = await GetAllGHLabels(site);
		const tagsAndDescription = monitors.map((monitor) => {
			return { tag: monitor.tag, description: monitor.name };
		});
		//add incident label if does not exist

		if (ghLabels.indexOf("incident") === -1) {
			await CreateGHLabel(site, "incident", "Status of the site");
		}
		if (ghLabels.indexOf("resolved") === -1) {
			await CreateGHLabel(site, "resolved", "Incident is resolved", "65dba6");
		}
		if (ghLabels.indexOf("identified") === -1) {
			await CreateGHLabel(site, "identified", "Incident is Identified", "EBE3D5");
		}
		if (ghLabels.indexOf("manual") === -1) {
			await CreateGHLabel(site, "manual", "Manually Created Incident", "6499E9");
		}
		if (ghLabels.indexOf("auto") === -1) {
			await CreateGHLabel(site, "auto", "Automatically Created Incident", "D6C0B3");
		}
		if (ghLabels.indexOf("investigating") === -1) {
			await CreateGHLabel(site, "investigating", "Incident is investigated", "D4E2D4");
		}
		if (ghLabels.indexOf("incident-degraded") === -1) {
			await CreateGHLabel(
				site,
				"incident-degraded",
				"Status is degraded of the site",
				"f5ba60"
			);
		}
		if (ghLabels.indexOf("incident-down") === -1) {
			await CreateGHLabel(site, "incident-down", "Status is down of the site", "ea3462");
		}
		//add tags if does not exist
		for (let i = 0; i < tagsAndDescription.length; i++) {
			const tag = tagsAndDescription[i].tag;
			const description = tagsAndDescription[i].description;
			if (ghLabels.indexOf(tag) === -1) {
				await CreateGHLabel(site, tag, description);
			}
		}

		console.log("✅ Github labels created successfully");
	}
}

Build();

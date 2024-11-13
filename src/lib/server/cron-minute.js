// @ts-nocheck
import axios from "axios";
import ping from "ping";
import fs from "fs-extra";
import { UP, DOWN, DEGRADED } from "./constants.js";
import {
	GetNowTimestampUTC,
	GetMinuteStartNowTimestampUTC,
	GetMinuteStartTimestampUTC
} from "./tool.js";
import { GetIncidents, GetEndTimeFromBody, GetStartTimeFromBody, CloseIssue } from "./github.js";
import Randomstring from "randomstring";
import Queue from "queue";
import dotenv from "dotenv";
import path from "path";
dotenv.config();

const Kener_folder = "./database";
const apiQueue = new Queue({
	concurrency: 10, // Number of tasks that can run concurrently
	timeout: 10000, // Timeout in ms after which a task will be considered as failed (optional)
	autostart: true // Automatically start the queue (optional)
});

async function manualIncident(monitor, githubConfig) {
	let incidentsResp = await GetIncidents(monitor.tag, githubConfig, "open");

	let manualData = {};
	if (incidentsResp.length == 0) {
		return manualData;
	}
	let timeDownStart = +Infinity;
	let timeDownEnd = 0;
	let timeDegradedStart = +Infinity;
	let timeDegradedEnd = 0;
	for (let i = 0; i < incidentsResp.length; i++) {
		const incident = incidentsResp[i];
		const incidentNumber = incident.number;
		let start_time = GetStartTimeFromBody(incident.body);
		let allLabels = incident.labels.map((label) => label.name);
		if (
			allLabels.indexOf("incident-degraded") == -1 &&
			allLabels.indexOf("incident-down") == -1
		) {
			continue;
		}

		if (start_time === null) {
			continue;
		}
		let newIncident = {
			start_time: start_time
		};
		let end_time = GetEndTimeFromBody(incident.body);

		if (end_time !== null) {
			newIncident.end_time = end_time;
			if (end_time <= GetNowTimestampUTC() && incident.state === "open") {
				//close the issue after 30 secs
				setTimeout(async () => {
					await CloseIssue(githubConfig, incidentNumber);
				}, 30000);
			}
		} else {
			newIncident.end_time = GetNowTimestampUTC();
		}

		//check if labels has incident-degraded

		if (allLabels.indexOf("incident-degraded") !== -1) {
			timeDegradedStart = Math.min(timeDegradedStart, newIncident.start_time);
			timeDegradedEnd = Math.max(timeDegradedEnd, newIncident.end_time);
		}
		if (allLabels.indexOf("incident-down") !== -1) {
			timeDownStart = Math.min(timeDownStart, newIncident.start_time);
			timeDownEnd = Math.max(timeDownEnd, newIncident.end_time);
		}
	}

	//start from start of minute if unix timeDownStart to timeDownEnd, step each minute
	let start = GetMinuteStartTimestampUTC(timeDegradedStart);
	let end = GetMinuteStartTimestampUTC(timeDegradedEnd);

	for (let i = start; i <= end; i += 60) {
		manualData[i] = {
			status: DEGRADED,
			latency: 0,
			type: "manual"
		};
	}

	start = GetMinuteStartTimestampUTC(timeDownStart);
	end = GetMinuteStartTimestampUTC(timeDownEnd);
	for (let i = start; i <= end; i += 60) {
		manualData[i] = {
			status: DOWN,
			latency: 0,
			type: "manual"
		};
	}
	return manualData;
}

function replaceAllOccurrences(originalString, searchString, replacement) {
	const regex = new RegExp(`\\${searchString}`, "g");
	const replacedString = originalString.replace(regex, replacement);
	return replacedString;
}
const pingCall = async (hostsV4, hostsV6) => {
	let alive = true;
	let latencyTotal = 0;
	let countHosts = hostsV4.length + hostsV6.length;

	for (let i = 0; i < hostsV4.length; i++) {
		const host = hostsV4[i].trim();
		try {
			let res = await ping.promise.probe(host);
			alive = alive && res.alive;
			latencyTotal += res.time;
		} catch (error) {
			alive = alive && false;
			latencyTotal += 30;
		}
	}

	for (let i = 0; i < hostsV6.length; i++) {
		const host = hostsV6[i].trim();
		try {
			let res = await ping.promise.probe(host, {
				v6: true,
				timeout: false
			});
			alive = alive && res.alive;
			latencyTotal += res.time;
		} catch (error) {
			alive = alive && false;
			latencyTotal += 30;
		}
	}
	return {
		status: alive ? UP : DOWN,
		latency: parseInt(latencyTotal / countHosts),
		type: "realtime"
	};
};
const apiCall = async (envSecrets, url, method, headers, body, timeout, monitorEval) => {
	let axiosHeaders = {};
	axiosHeaders["User-Agent"] = "Kener/0.0.1";
	axiosHeaders["Accept"] = "*/*";
	const start = Date.now();
	//replace all secrets
	for (let i = 0; i < envSecrets.length; i++) {
		const secret = envSecrets[i];
		if (!!body) {
			body = replaceAllOccurrences(body, secret.find, secret.replace);
		}
		if (!!url) {
			url = replaceAllOccurrences(url, secret.find, secret.replace);
		}
		if (!!headers) {
			headers = replaceAllOccurrences(headers, secret.find, secret.replace);
		}
	}
	if (!!headers) {
		headers = JSON.parse(headers);
		axiosHeaders = { ...axiosHeaders, ...headers };
	}

	const options = {
		method: method,
		headers: headers,
		timeout: timeout,
		transformResponse: (r) => r
	};
	if (!!headers) {
		options.headers = headers;
	}
	if (!!body) {
		options.data = body;
	}
	let statusCode = 500;
	let latency = 0;
	let resp = "";
	let timeoutError = false;
	try {
		let data = await axios(url, options);
		statusCode = data.status;
		resp = data.data;
	} catch (err) {
		if (err.message.startsWith("timeout of") && err.message.endsWith("exceeded")) {
			timeoutError = true;
		}

		if (err.response !== undefined && err.response.status !== undefined) {
			statusCode = err.response.status;
		}
		if (err.response !== undefined && err.response.data !== undefined) {
			resp = err.response.data;
		}
	} finally {
		const end = Date.now();
		latency = end - start;
	}
	resp = Buffer.from(resp).toString("base64");
	let evalResp = eval(monitorEval + `(${statusCode}, ${latency}, "${resp}")`);
	if (evalResp === undefined || evalResp === null) {
		evalResp = {
			status: DOWN,
			latency: latency,
			type: "error"
		};
	} else if (
		evalResp.status === undefined ||
		evalResp.status === null ||
		[UP, DOWN, DEGRADED].indexOf(evalResp.status) === -1
	) {
		evalResp = {
			status: DOWN,
			latency: latency,
			type: "error"
		};
	} else {
		evalResp.type = "realtime";
	}

	let toWrite = {
		status: DOWN,
		latency: latency,
		type: "error"
	};
	if (evalResp.status !== undefined && evalResp.status !== null) {
		toWrite.status = evalResp.status;
	}
	if (evalResp.latency !== undefined && evalResp.latency !== null) {
		toWrite.latency = evalResp.latency;
	}
	if (evalResp.type !== undefined && evalResp.type !== null) {
		toWrite.type = evalResp.type;
	}
	if (timeoutError) {
		toWrite.type = "timeout";
	}

	return toWrite;
};
const getWebhookData = async (monitor) => {
	let originalData = {};

	let files = fs.readdirSync(Kener_folder);
	files = files.filter((file) => file.startsWith(monitor.folderName + ".webhook"));
	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		let webhookData = {};
		try {
			let fd = fs.readFileSync(Kener_folder + "/" + file, "utf8");
			webhookData = JSON.parse(fd);
			for (const timestamp in webhookData) {
				originalData[timestamp] = webhookData[timestamp];
			}
			//delete the file
			fs.unlinkSync(Kener_folder + "/" + file);
		} catch (error) {
			console.error(error);
		}
	}
	return originalData;
};
const updateDayData = async (mergedData, startOfMinute, monitor) => {
	let dayData = JSON.parse(fs.readFileSync(monitor.path0Day, "utf8"));

	for (const timestamp in mergedData) {
		dayData[timestamp] = mergedData[timestamp];
	}

	let since = 24 * 91;
	let mxBackDate = startOfMinute - since * 3600;
	let _0Day = {};
	for (const ts in dayData) {
		const element = dayData[ts];
		if (ts >= mxBackDate) {
			_0Day[ts] = element;
		}
	}

	//sort the keys
	let keys = Object.keys(_0Day);
	keys.sort();
	let sortedDay0 = {};
	keys.reverse().forEach((key) => {
		sortedDay0[key] = _0Day[key];
	});
	try {
		fs.writeFileSync(monitor.path0Day, JSON.stringify(sortedDay0, null, 2));
	} catch (error) {
		console.error(error);
	}
};

const Minuter = async (envSecrets, monitor, githubConfig) => {
	if (apiQueue.length > 0) {
		console.log("Queue length is " + apiQueue.length);
	}
	let apiData = {};
	let pingData = {};
	let webhookData = {};
	let manualData = {};
	const startOfMinute = GetMinuteStartNowTimestampUTC();

	if (monitor.hasAPI) {
		let apiResponse = await apiCall(
			envSecrets,
			monitor.api.url,
			monitor.api.method,
			JSON.stringify(monitor.api.headers),
			monitor.api.body,
			monitor.api.timeout,
			monitor.api.eval
		);
		apiData[startOfMinute] = apiResponse;
		if (apiResponse.type === "timeout") {
			console.log(
				"Retrying api call for " + monitor.name + " at " + startOfMinute + " due to timeout"
			);
			//retry
			apiQueue.push(async (cb) => {
				apiCall(
					envSecrets,
					monitor.api.url,
					monitor.api.method,
					JSON.stringify(monitor.api.headers),
					monitor.api.body,
					monitor.api.timeout,
					monitor.api.eval
				).then(async (data) => {
					let day0 = {};
					day0[startOfMinute] = data;
					fs.writeFileSync(
						Kener_folder +
							`/${monitor.folderName}.webhook.${Randomstring.generate()}.json`,
						JSON.stringify(day0, null, 2)
					);
					cb();
				});
			});
		}
	}

	if (monitor.hasPing) {
		let pingResponse = await pingCall(monitor.ping.hostsV4, monitor.ping.hostsV6);
		pingData[startOfMinute] = pingResponse;
	}

	webhookData = await getWebhookData(monitor);
	manualData = await manualIncident(monitor, githubConfig);
	//merge noData, apiData, webhookData, dayData
	let mergedData = {};
	if (monitor.defaultStatus !== undefined && monitor.defaultStatus !== null) {
		if ([UP, DOWN, DEGRADED].indexOf(monitor.defaultStatus) !== -1) {
			mergedData[startOfMinute] = {
				status: monitor.defaultStatus,
				latency: 0,
				type: "defaultStatus"
			};
		}
	}

	for (const timestamp in pingData) {
		mergedData[timestamp] = pingData[timestamp];
	}

	for (const timestamp in apiData) {
		mergedData[timestamp] = apiData[timestamp];
	}
	for (const timestamp in webhookData) {
		mergedData[timestamp] = webhookData[timestamp];
	}
	for (const timestamp in manualData) {
		mergedData[timestamp] = manualData[timestamp];
	}

	//update day data
	await updateDayData(mergedData, startOfMinute, monitor);
};
apiQueue.start((err) => {
	if (err) {
		console.error("Error occurred:", err);
	} else {
		console.log("All tasks completed");
	}
});
export { Minuter };

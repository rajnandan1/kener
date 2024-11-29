// @ts-nocheck
import axios from "axios";
import ping from "ping";
import { UP, DOWN, DEGRADED } from "./constants.js";
import {
	GetNowTimestampUTC,
	GetMinuteStartNowTimestampUTC,
	GetMinuteStartTimestampUTC,
	ReplaceAllOccurrences,
	GetRequiredSecrets
} from "./tool.js";
import {
	GetIncidentsManual,
	GetEndTimeFromBody,
	GetStartTimeFromBody,
	CloseIssue
} from "./github.js";
import Randomstring from "randomstring";
import Queue from "queue";
import dotenv from "dotenv";
import path from "path";
import db from "./db/db.js";
import notification from "./notification/notif.js";
import DNSResolver from "./dns.js";
import alerting from "./alerting.js";

dotenv.config();

const REALTIME = "realtime";
const TIMEOUT = "timeout";
const ERROR = "error";
const MANUAL = "manual";

const apiQueue = new Queue({
	concurrency: 10, // Number of tasks that can run concurrently
	timeout: 10000, // Timeout in ms after which a task will be considered as failed (optional)
	autostart: true // Automatically start the queue (optional)
});

const alertingQueue = new Queue({
	concurrency: 10, // Number of tasks that can run concurrently
	timeout: 10000, // Timeout in ms after which a task will be considered as failed (optional)
	autostart: true // Automatically start the queue (optional)
});

async function manualIncident(monitor, githubConfig) {
	let incidentsResp = await GetIncidentsManual(monitor.tag, "open");

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
					await CloseIssue(incidentNumber);
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
			type: MANUAL
		};
	}

	start = GetMinuteStartTimestampUTC(timeDownStart);
	end = GetMinuteStartTimestampUTC(timeDownEnd);
	for (let i = start; i <= end; i += 60) {
		manualData[i] = {
			status: DOWN,
			latency: 0,
			type: MANUAL
		};
	}
	return manualData;
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
		type: REALTIME
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
			body = ReplaceAllOccurrences(body, secret.find, secret.replace);
		}
		if (!!url) {
			url = ReplaceAllOccurrences(url, secret.find, secret.replace);
		}
		if (!!headers) {
			headers = ReplaceAllOccurrences(headers, secret.find, secret.replace);
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
			type: ERROR
		};
	} else if (
		evalResp.status === undefined ||
		evalResp.status === null ||
		[UP, DOWN, DEGRADED].indexOf(evalResp.status) === -1
	) {
		evalResp = {
			status: DOWN,
			latency: latency,
			type: ERROR
		};
	} else {
		evalResp.type = REALTIME;
	}

	let toWrite = {
		status: DOWN,
		latency: latency,
		type: ERROR
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
		toWrite.type = TIMEOUT;
	}

	return toWrite;
};

async function dsnChecker(dnsResolver, host, recordType, matchType, values) {
	try {
		let queryStartTime = Date.now();
		let dnsRes = await dnsResolver.getRecord(host, recordType);
		let latency = Date.now() - queryStartTime;

		if (dnsRes[recordType] === undefined) {
			return {
				status: DOWN,
				latency: latency,
				type: REALTIME
			};
		}
		let data = dnsRes[recordType];
		let dnsData = data.map((d) => d.data);
		if (matchType === "ALL") {
			for (let i = 0; i < values.length; i++) {
				if (dnsData.indexOf(values[i].trim()) === -1) {
					return {
						status: DOWN,
						latency: latency,
						type: REALTIME
					};
				}
			}
			return {
				status: UP,
				latency: latency,
				type: REALTIME
			};
		} else if (matchType === "ANY") {
			for (let i = 0; i < values.length; i++) {
				if (dnsData.indexOf(values[i].trim()) !== -1) {
					return {
						status: UP,
						latency: latency,
						type: REALTIME
					};
				}
			}
			return {
				status: DOWN,
				latency: latency,
				type: REALTIME
			};
		}
	} catch (error) {
		console.log("Error in dnsChecker", error);
		return {
			status: DOWN,
			latency: 0,
			type: REALTIME
		};
	}
}

const Minuter = async (monitor, githubConfig, siteData) => {
	if (apiQueue.length > 0) {
		console.log("Queue length is " + apiQueue.length);
	}
	let apiData = {};
	let pingData = {};
	let webhookData = {};
	let manualData = {};
	let dnsData = {};
	let envSecrets = GetRequiredSecrets(
		`${monitor.url} ${monitor.body} ${JSON.stringify(monitor.headers)}`
	);

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
		if (apiResponse.type === TIMEOUT) {
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
					db.insertData({
						monitorTag: monitor.tag,
						timestamp: startOfMinute,
						status: data.status,
						latency: data.latency,
						type: data.type
					});
					cb();
				});
			});
		}
	}

	if (monitor.hasPing) {
		let pingResponse = await pingCall(monitor.ping.hostsV4, monitor.ping.hostsV6);
		pingData[startOfMinute] = pingResponse;
	}

	if (monitor.hasDNS) {
		const dnsResolver = new DNSResolver(monitor.dns.nameServer);
		let dnsResponse = await dsnChecker(
			dnsResolver,
			monitor.dns.host,
			monitor.dns.lookupRecord,
			monitor.dns.matchType,
			monitor.dns.values
		);
		dnsData[startOfMinute] = dnsResponse;
	}

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

	for (const timestamp in manualData) {
		mergedData[timestamp] = manualData[timestamp];
	}

	for (const timestamp in dnsData) {
		mergedData[timestamp] = dnsData[timestamp];
	}

	for (const timestamp in mergedData) {
		const element = mergedData[timestamp];
		db.insertData({
			monitorTag: monitor.tag,
			timestamp: parseInt(timestamp),
			status: element.status,
			latency: element.latency,
			type: element.type
		});
	}

	if (monitor.alerting) {
		alertingQueue.push(async (cb) => {
			alerting(monitor, siteData);
			cb();
		});
	}
};
apiQueue.start((err) => {
	if (err) {
		console.error("Error occurred:", err);
	} else {
		console.log("All tasks completed");
	}
});
alertingQueue.start((err) => {
	if (err) {
		console.error("Error occurred:", err);
	} else {
		console.log("All tasks completed");
	}
});
export { Minuter };

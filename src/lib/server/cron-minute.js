// @ts-nocheck
import axios from "axios";
import ping from "ping";
import { UP, DOWN, DEGRADED } from "./constants.js";
import {
	GetMinuteStartNowTimestampUTC,
	ReplaceAllOccurrences,
	GetRequiredSecrets
} from "./tool.js";

import alerting from "./alerting.js";
import Queue from "queue";
import dotenv from "dotenv";
import path from "path";
import db from "./db/db.js";
import notification from "./notification/notif.js";
import DNSResolver from "./dns.js";

dotenv.config();

const REALTIME = "realtime";
const TIMEOUT = "timeout";
const ERROR = "error";
const MANUAL = "manual";

const alertingQueue = new Queue({
	concurrency: 10, // Number of tasks that can run concurrently
	timeout: 10000, // Timeout in ms after which a task will be considered as failed (optional)
	autostart: true // Automatically start the queue (optional)
});

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

async function manualIncident(monitor) {
	let startTs = GetMinuteStartNowTimestampUTC();
	let impactArr = await db.getIncidentsByMonitorTagRealtime(monitor.tag, startTs);

	let impact = "";
	if (impactArr.length == 0) {
		return {};
	}

	for (let i = 0; i < impactArr.length; i++) {
		const element = impactArr[i];

		let autoIncidents = await db.getActiveAlertIncident(
			monitor.tag,
			element.monitor_impact,
			element.id
		);

		if (!!autoIncidents) {
			continue;
		}

		if (element.monitor_impact === "DOWN") {
			impact = "DOWN";
			break;
		}
		if (element.monitor_impact === "DEGRADED") {
			impact = "DEGRADED";
		}
	}

	if (impact === "") {
		return {};
	}

	let manualData = {
		[startTs]: {
			status: impact,
			latency: 0,
			type: MANUAL
		}
	};
	return manualData;
}

const pingCall = async (hostsV4, hostsV6) => {
	if (hostsV4 === undefined) hostsV4 = [];
	if (hostsV6 === undefined) hostsV6 = [];
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
	axiosHeaders["User-Agent"] = "Kener/2.0.0";
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
		headers = headers.reduce((acc, header) => {
			acc[header.key] = header.value;
			return acc;
		}, {});
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
		} else {
			resp = JSON.stringify(resp);
		}
	} finally {
		const end = Date.now();
		latency = end - start;
		if (resp === undefined || resp === null) {
			resp = "";
		}
	}
	resp = Buffer.from(resp).toString("base64");

	let evalResp = undefined;

	try {
		evalResp = eval(monitorEval + `(${statusCode}, ${latency}, "${resp}")`);
	} catch (error) {
		console.log("Error in monitorEval", error.message);
	}

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

const Minuter = async (monitor) => {
	let realTimeData = {};
	let manualData = {};

	const startOfMinute = GetMinuteStartNowTimestampUTC();
	if (monitor.monitor_type === "API") {
		let envSecrets = GetRequiredSecrets(
			`${monitor.type_data.url} ${monitor.type_data.body} ${JSON.stringify(monitor.type_data.headers)}`
		);

		if (monitor.type_data.eval === "") {
			monitor.type_data.eval = defaultEval;
		}

		let apiResponse = await apiCall(
			envSecrets,
			monitor.type_data.url,
			monitor.type_data.method,
			JSON.stringify(monitor.type_data.headers),
			monitor.type_data.body,
			monitor.type_data.timeout,
			monitor.type_data.eval
		);

		realTimeData[startOfMinute] = apiResponse;
	} else if (monitor.monitor_type === "PING") {
		let pingResponse = await pingCall(monitor.type_data.hostsV4, monitor.type_data.hostsV6);
		realTimeData[startOfMinute] = pingResponse;
	} else if (monitor.monitor_type === "DNS") {
		const dnsResolver = new DNSResolver(monitor.type_data.nameServer);
		let dnsResponse = await dsnChecker(
			dnsResolver,
			monitor.type_data.host,
			monitor.type_data.lookupRecord,
			monitor.type_data.matchType,
			monitor.type_data.values
		);
		realTimeData[startOfMinute] = dnsResponse;
	}

	manualData = await manualIncident(monitor);
	//merge noData, apiData, webhookData, dayData
	let mergedData = {};

	if (monitor.default_status !== undefined && monitor.default_status !== null) {
		if ([UP, DOWN, DEGRADED].indexOf(monitor.default_status) !== -1) {
			mergedData[startOfMinute] = {
				status: monitor.default_status,
				latency: 0,
				type: "default_status"
			};
		}
	}

	for (const timestamp in realTimeData) {
		mergedData[timestamp] = realTimeData[timestamp];
	}

	for (const timestamp in manualData) {
		mergedData[timestamp] = manualData[timestamp];
	}

	for (const timestamp in mergedData) {
		const element = mergedData[timestamp];
		db.insertMonitoringData({
			monitor_tag: monitor.tag,
			timestamp: parseInt(timestamp),
			status: element.status,
			latency: element.latency,
			type: element.type
		});
	}
	alertingQueue.push(async (cb) => {
		setTimeout(async () => {
			await alerting(monitor);
			cb();
		}, 1042);
	});
};

alertingQueue.start((err) => {
	if (err) {
		console.error("Error occurred:", err);
		process.exit(1);
	}
});
export { Minuter };

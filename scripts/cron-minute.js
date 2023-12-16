import axios from "axios";
import fs from "fs-extra";
import { UP, DOWN, DEGRADED } from "./constants.js";
import { GetIncidentsOpen, GetStartTimeFromBody, GetEndTimeFromBody, GetNowTimestampUTC, GetMinuteStartNowTimestampUTC,GetMinuteStartTimestampUTC, GetDayStartTimestampUTC } from "./tool.js";
import Randomstring from "randomstring";
import Queue from "queue";

const Kener_folder = process.env.PUBLIC_KENER_FOLDER;
const apiQueue = new Queue({
    concurrency: 10, // Number of tasks that can run concurrently
    timeout: 10000, // Timeout in ms after which a task will be considered as failed (optional)
    autostart: true, // Automatically start the queue (optional)
});

async function manualIncident(monitor, githubConfig){
    let incidentsResp = await GetIncidentsOpen(monitor.tag, githubConfig);
	
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
        let start_time = GetStartTimeFromBody(incident.body);
		
        if (start_time === null) {
            continue;
        }
        let newIncident = {
            start_time: start_time,
        };
        let end_time = GetEndTimeFromBody(incident.body);
        if (end_time !== null) {
            newIncident.end_time = end_time;
        } else {
            newIncident.end_time = GetNowTimestampUTC();
        }

        let allLabels = incident.labels.map((label) => label.name);
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
            type: "manual",
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
        transformResponse: (r) => r,
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
            type: "error",
        };
    } else if (evalResp.status === undefined || evalResp.status === null || [UP, DOWN, DEGRADED].indexOf(evalResp.status) === -1) {
        evalResp = {
            status: DOWN,
            latency: latency,
            type: "error",
        };
    } else {
        evalResp.type = "realtime";
    }

    let toWrite = {
        status: DOWN,
        latency: latency,
        type: "error",
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
const getDayData = async (monitor) => {
    let originalData = {};
    try {
        let fd = fs.readFileSync(monitor.path0Day, "utf8");
        originalData = JSON.parse(fd);
    } catch (error) {
        console.error(error);
    }
    return originalData;
};
const updateDayData = async (mergedData, startOfMinute, monitor, since) => {
    let mxBackDate = startOfMinute - (since * 3600);
	let _0Day = {};
    for (const ts in mergedData) {
        const element = mergedData[ts];
        if (ts >= mxBackDate) {
            _0Day[ts] = element;
        }
    }

    //sort the keys
    let keys = Object.keys(_0Day);
    keys.sort();
    let sortedDay0 = {};
    keys.reverse() //reverse to keep 90days data
        .slice(0, since * 60)  
        .reverse() //reverse to keep 0day data
        .forEach((key) => {
            sortedDay0[key] = _0Day[key];
        });
    try {
        fs.writeFileSync(monitor.path0Day, JSON.stringify(sortedDay0, null, 2));
    } catch (error) {
        console.error(error);
    }
};

const update90DayData = async (monitor) => {
	const mergedData = JSON.parse(fs.readFileSync(monitor.path0Day, "utf8"));

    let _90Day = {};
    let _90File = monitor.path90Day;
    try {
        let fd = fs.readFileSync(_90File, "utf8");
        _90Day = JSON.parse(fd);
    } catch (err) {
        fs.ensureFileSync(_90File);
        fs.writeFileSync(_90File, JSON.stringify({}));
    }
	let temp = {};
    for (const timestamp in mergedData) {
        
        let dayTS = GetDayStartTimestampUTC(timestamp);

        if (temp[dayTS] === undefined) {
            temp[dayTS] = {
                timestamp: dayTS,
                UP: 0,
                DEGRADED: 0,
                DOWN: 0,
                avgLatency: 0,
                latency: 0,
            };
        }

        let _this = mergedData[timestamp];
        let d = temp[dayTS];	

        temp[dayTS].UP = d.UP + (_this.status == UP ? 1 : 0);
        temp[dayTS].DEGRADED = d.DEGRADED + (_this.status == DEGRADED ? 1 : 0);
        temp[dayTS].DOWN = d.DOWN + (_this.status == DOWN ? 1 : 0);
        temp[dayTS].latency = d.latency + _this.latency;
    }

    for (const dayTS in temp) {
        let d = temp[dayTS];
        if (d.UP + d.DEGRADED + d.DOWN === 0) {
            continue;
        }
        let avgLatency = (d.latency / (d.UP + d.DEGRADED + d.DOWN)).toFixed(0);
        temp[dayTS].avgLatency = avgLatency;
    }
	_90Day = {..._90Day, ...temp};
    //sort the keys
    let keys = Object.keys(_90Day);
    keys.sort();
    let sorted90Day = {};

    keys.reverse() //reverse to keep 90days data
        .slice(0, 90) //90days data
        .reverse() //reverse to keep 0day data
        .forEach((key) => {
            sorted90Day[key] = _90Day[key];
        });

    fs.writeFileSync(_90File, JSON.stringify(sorted90Day, null, 2));
};
const Minuter = async (envSecrets, monitor, githubConfig) => {
    if (apiQueue.length > 0) console.log("Queue length is " + apiQueue.length);
    let apiData = {};
    let webhookData = {};
    let manualData = {};
    const startOfMinute = GetMinuteStartNowTimestampUTC();
    let dayData = {};

    if (monitor.hasAPI) {
        let apiResponse = await apiCall(envSecrets, monitor.url, monitor.method, JSON.stringify(monitor.headers), monitor.body, monitor.timeout, monitor.eval);
        apiData[startOfMinute] = apiResponse;
        if (apiResponse.type === "timeout") {
            console.log("Retrying api call for " + monitor.name + " at " + startOfMinute + " due to timeout");
            //retry
            apiQueue.push(async (cb) => {
                apiCall(envSecrets, monitor.url, monitor.method, JSON.stringify(monitor.headers), monitor.body, monitor.timeout, monitor.eval).then(async (data) => {
                    let day0 = {};
                    day0[startOfMinute] = data;
                    fs.writeFileSync(Kener_folder + `/${monitor.folderName}.webhook.${Randomstring.generate()}.json`, JSON.stringify(day0, null, 2));
                    cb();
                });
            });
        }
    }
    webhookData = await getWebhookData(monitor);
    dayData = await getDayData(monitor);
	manualData = await manualIncident(monitor, githubConfig);

    //merge apiData, webhookData, dayData
    let mergedData = {};
	// console.log(Object.keys(dayData).length);;
	console.log(Object.keys(mergedData).length);
    for (const timestamp in dayData) {
        mergedData[timestamp] = dayData[timestamp];
    }
	console.log(Object.keys(mergedData).length);
    for (const timestamp in apiData) {
        mergedData[timestamp] = apiData[timestamp];
    }
	console.log(Object.keys(mergedData).length);
    for (const timestamp in webhookData) {
        mergedData[timestamp] = webhookData[timestamp];
    }
	console.log(Object.keys(mergedData).length);
    for (const timestamp in manualData) {
        mergedData[timestamp] = manualData[timestamp];
    }
	console.log(Object.keys(mergedData).filter((x) => !Object.keys(mergedData).includes(x)));

    //update day data
    await updateDayData(mergedData, startOfMinute, monitor, githubConfig.incidentSince);
    //update 90day data
    await update90DayData(monitor);
};
apiQueue.start((err) => {
    if (err) {
        console.error("Error occurred:", err);
    } else {
        console.log("All tasks completed");
    }
});
export { Minuter };

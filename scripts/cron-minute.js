import axios from "axios";
import fs from "fs-extra";
import { UP, DOWN, DEGRADED } from "./constants.js";
import moment from "moment";
import Randomstring from "randomstring";
import Queue from "queue";
const apiQueue = new Queue({
    concurrency: 10, // Number of tasks that can run concurrently
    timeout: 10000, // Timeout in ms after which a task will be considered as failed (optional)
    autostart: true, // Automatically start the queue (optional)
});
 

function replaceAllOccurrences(originalString, searchString, replacement) {
    const regex = new RegExp(`\\${searchString}`, "g");
    const replacedString = originalString.replace(regex, replacement);
    return replacedString;
}
const Kener_folder = process.env.PUBLIC_KENER_FOLDER;

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
	if(timeoutError){
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
            for (const timestampISO in webhookData) {
                originalData[timestampISO] = webhookData[timestampISO];
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
const updateDayData = async (mergedData, startOfMinute, monitor) => {
    let today = moment(startOfMinute).subtract(1, "days").startOf("day").toISOString();
    let _0Day = {};
    for (const ts in mergedData) {
        const element = mergedData[ts];
        if (moment(ts).isAfter(moment(today))) {
            _0Day[ts] = element;
        }
    }

    //sort the keys
    let keys = Object.keys(_0Day);
    keys.sort((a, b) => {
        return moment(a).isBefore(moment(b)) ? -1 : 1;
    });
    let sortedDay0 = {};
    keys.reverse() //reverse to keep 90days data
        .slice(0, 2880) //2days data
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

const update90DayData = async (mergedData, startOfMinute, monitor) => {
    let _90Day = {};
    let _90File = monitor.path90Day;
    try {
        let fd = fs.readFileSync(_90File, "utf8");
        _90Day = JSON.parse(fd);
    } catch (err) {
        fs.ensureFileSync(_90File);
        fs.writeFileSync(_90File, JSON.stringify({}));
    }
    let dayISO = moment(startOfMinute).startOf("day").toISOString();

    //calculat 90day data from mergedData
    let up = 0,
        degraded = 0,
        down = 0,
        latency = 0;

    for (const timestampISO in mergedData) {
        //only consider data from last today
        if (!moment(timestampISO).isAfter(moment(dayISO))) {
            continue;
        }
        const element = mergedData[timestampISO];
        up += element.status == UP ? 1 : 0;
        degraded += element.status == DEGRADED ? 1 : 0;
        down += element.status == DOWN ? 1 : 0;
        latency += element.latency;
    }
    if (up + degraded + down === 0) return;
    let avgLatency = (latency / (up + degraded + down)).toFixed(0);

    _90Day[dayISO] = {
        timestamp: dayISO,
        UP: up,
        DEGRADED: degraded,
        DOWN: down,
        avgLatency: avgLatency,
        latency: latency,
    };

    //sort the keys
    let keys = Object.keys(_90Day);
    keys.sort((a, b) => {
        return moment(a).isBefore(moment(b)) ? -1 : 1;
    });
    let sorted90Day = {};

    keys.reverse() //reverse to keep 90days data
        .slice(0, 90) //90days data
        .reverse() //reverse to keep 0day data
        .forEach((key) => {
            sorted90Day[key] = _90Day[key];
        });

    fs.writeFileSync(_90File, JSON.stringify(sorted90Day, null, 2));
};
const Minuter = async (envSecrets, monitor) => {
	console.log("Queue length is " + apiQueue.length);
    let apiData = {};
    let webhookData = {};
    const startOfMinute = moment().startOf("minute").toISOString();
    let dayData = {};
    if (monitor.hasAPI) {
        let apiResponse = await apiCall(envSecrets, monitor.url, monitor.method, JSON.stringify(monitor.headers), monitor.body, monitor.timeout, monitor.eval);
		apiData[startOfMinute] = apiResponse;
		if(apiResponse.type === "timeout"){
			console.log("Retrying api call")
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
		// apiData[startOfMinute] = await apiCall(envSecrets, startOfMinute, monitor.url, monitor.method, JSON.stringify(monitor.headers), monitor.body, monitor.timeout, monitor.eval);
		
	}
    webhookData = await getWebhookData(monitor);
    dayData = await getDayData(monitor);

    //merge apiData, webhookData, dayData
    let mergedData = {};

    for (const timestampISO in dayData) {
        mergedData[timestampISO] = dayData[timestampISO];
    }
    for (const timestampISO in apiData) {
        mergedData[timestampISO] = apiData[timestampISO];
    }
    for (const timestampISO in webhookData) {
        mergedData[timestampISO] = webhookData[timestampISO];
    }

    //update 90day data
    await update90DayData(mergedData, startOfMinute, monitor);

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

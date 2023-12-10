import axios from "axios";
import fs from "fs-extra";
import { UP, DOWN, DEGRADED } from "./constants.js";
import moment from "moment";


function replaceAllOccurrences(originalString, searchString, replacement) {
    const regex = new RegExp(`\\${searchString}`, "g");
    const replacedString = originalString.replace(regex, replacement);
    return replacedString;
}

const OneMinuteFetch = async (envSecrets, url, method, headers, body, timeout, cb, out) => {
	
	let axiosHeaders = {};
    axiosHeaders["User-Agent"] = "Kener/0.0.1";
    axiosHeaders["Accept"] = "*/*";
    const start = Date.now();
	const startOfMinute = moment(start).startOf("minute").toISOString();
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
	if (!!headers){
		headers = JSON.parse(headers);
		axiosHeaders = {...axiosHeaders, ...headers};
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

    try {
        let data = await axios(url, options);
        statusCode = data.status;
        resp = data.data;
    } catch (err) {
		console.error("API call error: " + err.message);
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
    let evalResp = eval(cb + `(${statusCode}, ${latency}, "${resp}")`);
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
	if(evalResp.status !== undefined && evalResp.status !== null){
		toWrite.status = evalResp.status;
	}
	if(evalResp.latency !== undefined && evalResp.latency !== null){
		toWrite.latency = evalResp.latency;
	}
	if(evalResp.type !== undefined && evalResp.type !== null){
		toWrite.type = evalResp.type;
	}
	let objectToWrite = {};
	objectToWrite[startOfMinute] = toWrite;

    let originalData = {};

    //read outfile out is the minute file
    try {
        let fd = fs.readFileSync(out, "utf8");
        originalData = JSON.parse(fd);
    } catch (error) {
        fs.ensureFileSync(out);
        fs.writeFileSync(out, JSON.stringify({}));
    }

	originalData[startOfMinute] = toWrite;
	
	//sort the keys
	let keys = Object.keys(originalData);
	keys.sort((a,b) => {
		return moment(a).isBefore(moment(b)) ? -1 : 1;
	});
    let sortedDay0 = {};
    keys.reverse()  //reverse to keep 90days data
        .slice(0, 129600)  //90days data
        .reverse() //reverse to keep 0day data
        .forEach((key) => {
            sortedDay0[key] = originalData[key];
        });
    try {
		fs.writeFileSync(out, JSON.stringify(sortedDay0, null, 2));
	} catch (error) {
		console.error(error);
	}

};

export { OneMinuteFetch };

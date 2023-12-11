import axios from "axios";
import fs from "fs-extra";
import { UP, DOWN, DEGRADED } from "./constants.js";
import moment from "moment";

function replaceAllOccurrences(originalString, searchString, replacement) {
    const regex = new RegExp(`\\${searchString}`, "g");
    const replacedString = originalString.replace(regex, replacement);
    return replacedString;
}
const Kener_folder = process.env.PUBLIC_KENER_FOLDER;
const OneMinuteFetch = async (envSecrets, folderName, url, method, headers, body, timeout, cb, out, out90) => {
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
    if (evalResp.status !== undefined && evalResp.status !== null) {
        toWrite.status = evalResp.status;
    }
    if (evalResp.latency !== undefined && evalResp.latency !== null) {
        toWrite.latency = evalResp.latency;
    }
    if (evalResp.type !== undefined && evalResp.type !== null) {
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

    //get data from webhook
    //read all files that end with .webhook
    let files = fs.readdirSync(Kener_folder);
    files = files.filter((file) => file.startsWith(folderName +".webhook"));
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

	//read originaldata, create a new file with 90days data
	let _90Day = {};
	let _90File = out90;
	try {
		let fd = fs.readFileSync(_90File, "utf8");
		_90Day = JSON.parse(fd);
	} catch (err) {
		fs.ensureFileSync(_90File);
		fs.writeFileSync(_90File, JSON.stringify({}));
	}
	let dayISO = moment(startOfMinute).startOf('day').toISOString();
	
	if (_90Day[dayISO] === undefined) {
        _90Day[dayISO] = {
            timestamp: dayISO,
            UP: toWrite.status == UP ? 1 : 0,
            DEGRADED: toWrite.status == DEGRADED ? 1 : 0,
            DOWN: toWrite.status == DOWN ? 1 : 0,
            avgLatency: toWrite.latency,
            latency: toWrite.latency,
        };
    } else {
		let d = _90Day[dayISO];
		let up = toWrite.status == UP ? d.UP + 1 : d.UP;
		let degraded = toWrite.status == DEGRADED ? d.DEGRADED + 1 : d.DEGRADED;
		let down = toWrite.status == DOWN ? d.DOWN + 1 : d.DOWN;

		_90Day[dayISO] = {
            timestamp: dayISO,
            UP: up,
            DEGRADED: degraded,
            DOWN: down,
            avgLatency: ((d.latency + toWrite.latency) / (d.UP + d.DEGRADED + d.DOWN + 1)).toFixed(0),
            latency: d.latency + toWrite.latency,
        };
	}
	

	fs.writeFileSync(_90File, JSON.stringify(_90Day, null, 2));

	//from originaldata, delete all values older than today
	let today = moment().startOf('day').toISOString();
	let _0Day = {};
	for (const ts in originalData) {
		const element = originalData[ts];
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
        .slice(0, 1440) //90days data
        .reverse() //reverse to keep 0day data
        .forEach((key) => {
            sortedDay0[key] = _0Day[key];
        });
    try {
        fs.writeFileSync(out, JSON.stringify(sortedDay0, null, 2));
    } catch (error) {
        console.error(error);
    }
};

export { OneMinuteFetch };

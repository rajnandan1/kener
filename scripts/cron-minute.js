import axios from "axios";
import fs from "fs-extra";
import { UP, DOWN, DEGRADED } from "./constants.js";
import moment from "moment";


const cruncDataForToday = (data, day) => {
    let ups = 0;
    let downs = 0;
    let degraded = 0;
    let latency = 0;

    for (let i = 0; i < data.length; i++) {
        const element = data[i];
        latency = latency + element.latency;
        if (element.status == UP) {
            ups++;
        } else if (element.status == DOWN) {
            downs++;
        } else if (element.status == DEGRADED) {
            degraded++;
        }
    }

    const resp = {
        latency: parseInt(latency / data.length),
    };
    resp[UP] = ups;
    resp[DOWN] = downs;
    resp[DEGRADED] = degraded;
    resp.timestamp = day;
    return resp;
};
function replaceAllOccurrences(originalString, searchString, replacement) {
    const regex = new RegExp(`\\${searchString}`, "g");
    const replacedString = originalString.replace(regex, replacement);
    return replacedString;
}

function addOrReplaceDate(list, data, timestamp) {
    let found = false;
    for (let i = 0; i < list.length; i++) {
        const element = list[i];
        if (element.timestamp === timestamp) {
            list[i] = data;
            found = true;
            break;
        }
    }
    if (!found) {
        list.unshift(data);
    }
    return list;
}
const OneMinuteFetch = async (envSecrets, url, method, headers, body, timeout, cb, out) => {
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
	if (!!headers){
		headers = JSON.parse(headers);
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
    let toWrite = eval(cb + `(${statusCode}, ${latency}, "${resp}")`);
    if (toWrite === undefined || toWrite === null) {
        toWrite = {
            status: DOWN,
            latency: latency,
            type: "error",
        };
    } else if (toWrite.status === undefined || toWrite.status === null || [UP, DOWN, DEGRADED].indexOf(toWrite.status) === -1) {
        toWrite.status = DOWN;
    }
    toWrite.timestamp = moment(start).startOf("minute").toISOString();
    toWrite.type = "realtime";
    let originalData = [];
    let finalData = [];

    //read outfile out is the minute file
    try {
        let fd = fs.readFileSync(out, "utf8");
        originalData = JSON.parse(fd);
        //insert toWrite to the front of the array
    } catch (error) {
        fs.ensureFileSync(out);
        fs.writeFileSync(out, JSON.stringify([]));
    }


    
    finalData[0] = toWrite;

    //get the first item backfill data if needed, take the first item as the reference
    if (originalData.length > 0) {
        //timestamp of the first item
        let firstItem = originalData[0];
        //compare timestamp, if towrite.timestamp - firstItem.timestamp > 1 minute, insert a new item
        let diff = moment(toWrite.timestamp).diff(moment(firstItem.timestamp), "minutes");

        if (diff > 1 && firstItem.type === "today") {
            for (let i = diff - 1; i >= 1; i--) {
                let newTimestamp = moment(firstItem.timestamp).add(i, "minutes").toISOString();
                finalData.push({
                    timestamp: newTimestamp,
                    status: toWrite.status,
                    latency: toWrite.latency,
                    type: "backfill",
                });
            }
        }
    }

    //copy data from originalData to finalData
    for (let i = 0; i < originalData.length; i++) {
        
        finalData.push(originalData[i]);
    }

     
    //write outfile
    fs.writeFileSync(out, JSON.stringify(finalData, null, 4));

};

export { OneMinuteFetch };

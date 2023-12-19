// @ts-nocheck
import fs from "fs-extra"
import { env } from "$env/dynamic/public";
import moment from "moment";
import { GetMinuteStartNowTimestampUTC, GetNowTimestampUTC, GetMinuteStartTimestampUTC } from "../../../scripts/tool.js";
import Randomstring from "randomstring";
const API_TOKEN = process.env.API_TOKEN;
const API_IP = process.env.API_IP;

const checkIfValidTag = function(tag){
	let tags = [];
	let monitors = [];
	try {
		monitors = JSON.parse(fs.readFileSync(env.PUBLIC_KENER_FOLDER + "/monitors.json", "utf8"));
		tags = monitors.map((monitor) => monitor.tag);
		if (tags.indexOf(tag) == -1) {
			throw new Error("not a valid tag");
		}
	} catch (err) {
		return false;
	}
	return true;
}

const store = function(data, authHeader, ip){
    const tag = data.tag;
    //remove Bearer from start in authHeader
    const authToken = authHeader.replace("Bearer ", "");
	if (authToken !== API_TOKEN) {
        return { error: "invalid token", status: 401 };
    }

	if (API_IP !== undefined && ip != "" && ip !== API_IP) {
        return { error: "invalid ip", status: 401 };
    }
    const resp = {};
    if (data.status === undefined || ["UP", "DOWN", "DEGRADED"].indexOf(data.status) === -1) {
        return { error: "status missing", status: 400 };
    }
    if (data.latency === undefined || isNaN(data.latency)) {
        return { error: "latency missing or not a number", status: 400 };
    }
    if (data.timestampInSeconds !== undefined && isNaN(data.timestampInSeconds)) {
        return { error: "timestampInSeconds not a number", status: 400 };
    }
    if (data.timestampInSeconds === undefined) {
        data.timestampInSeconds = GetNowTimestampUTC();
    }
	data.timestampInSeconds = GetMinuteStartTimestampUTC(data.timestampInSeconds);
    resp.status = data.status;
    resp.latency = data.latency;
    resp.type = "webhook";
    let timestamp = GetMinuteStartNowTimestampUTC();
    try {
        
        //throw error if timestamp is future or older than 90days
        if (data.timestampInSeconds > timestamp) {
            throw new Error("timestampInSeconds is in future");
        }
		//past 90 days only
        if (timestamp - data.timestampInSeconds > 90 * 24 * 60 * 60) {
            throw new Error("timestampInSeconds is older than 90days");
        }
    } catch (err) {
        return { error: err.message, status: 400 };
    }
    //check if tag is valid
    if (!checkIfValidTag(tag)) {
		return { error: "invalid tag", status: 400 };
	}

    //get the monitor object matching the tag
	let monitors = JSON.parse(fs.readFileSync(env.PUBLIC_KENER_FOLDER + "/monitors.json", "utf8"));
    const monitor = monitors.find((monitor) => monitor.tag === tag);

    //read the monitor.path0Day file
	let day0 = {};
	 

	


    day0[data.timestampInSeconds] = resp;
	//sort the keys
	 
	//create a random string with high cardinlity
	//to avoid cache

	//write the monitor.path0Day file
	fs.writeFileSync(env.PUBLIC_KENER_FOLDER + `/${monitor.folderName}.webhook.${Randomstring.generate()}.json`, JSON.stringify(day0, null, 2));


    return { status: 200, message: "success at " + data.timestampInSeconds };
}
export { store };

// @ts-nocheck
import fs from "fs-extra"
import { env } from "$env/dynamic/public";
import moment from "moment";
const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN;
const WEBHOOK_IP = process.env.WEBHOOK_IP;

const store = function(data, authHeader, ip){
    const tag = data.tag;
    //remove Bearer from start in authHeader
    const authToken = authHeader.replace("Bearer ", "");
	if (authToken !== WEBHOOK_TOKEN) {
        return { error: "invalid token", status: 401 };
    }

	if (WEBHOOK_IP !== undefined && ip != "" && ip !== WEBHOOK_IP) {
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
        data.timestampInSeconds = Math.floor(Date.now() / 1000);
    }
    resp.status = data.status;
    resp.latency = data.latency;
    resp.type = "webhook";
    let timestampISO = moment().toISOString();
    try {
        timestampISO = moment.unix(data.timestampInSeconds).toISOString();
        //throw error if timestampISO is future or older than 90days
        if (moment(timestampISO).isAfter(moment().add(1, "minute"))) {
            throw new Error("timestampInSeconds is in future");
        }
        if (moment(timestampISO).isBefore(moment().subtract(90, "days"))) {
            throw new Error("timestampInSeconds is older than 90days");
        }
    } catch (err) {
        return { error: err.message, status: 400 };
    }
    //check if tag is valid
    let tags = [];
    let monitors = [];
    try {
        monitors = JSON.parse(fs.readFileSync(env.PUBLIC_KENER_FOLDER + "/monitors.json", "utf8"));
        tags = monitors.map((monitor) => monitor.tag);
        if (tags.indexOf(tag) == -1) {
            throw new Error("not a valid tag");
        }
    } catch (err) {
        return { error: err.message, status: 400 };
    }

    //get the monitor object matching the tag
    const monitor = monitors.find((monitor) => monitor.tag === tag);

    //read the monitor.path0Day file
	let day0 = {};
	try {
		day0 = JSON.parse(fs.readFileSync(monitor.path0Day, "utf8"));
	} catch (error) {
		return { error: "something went wrong", status: 400 };
	}

	

    let timeStampISOMinute = moment(timestampISO).startOf('minute').toISOString();

    day0[timeStampISOMinute] = resp;
	//sort the keys
	let keys = Object.keys(day0);
	keys.sort((a,b) => {
		return moment(a).isBefore(moment(b)) ? -1 : 1;
	});
	let sortedDay0 = {};
	//oppsite of sort is required and only first 1440 keys are required
	keys.reverse()
        .slice(0, 129600)
        .reverse()
        .forEach((key) => {
            sortedDay0[key] = day0[key];
        });
	
	
	//write the monitor.path0Day file
	fs.writeFileSync(monitor.path0Day, JSON.stringify(sortedDay0, null, 2));


    return { status: 200, message: "success at " + timeStampISOMinute };
}
export { store };

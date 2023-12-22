// @ts-nocheck
import { MONITOR, SITE } from "./constants.js";

const IsValidURL = function (url) {
    return /^(http|https):\/\/[^ "]+$/.test(url);
};
const IsValidHTTPMethod = function (method) {
    return /^(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH)$/.test(method);
};
function generateRandomColor() {
    var randomColor = Math.floor(Math.random() * 16777215).toString(16);
    return randomColor;
    //random color will be freshly served
}
const LoadMonitorsPath = function () {
    const argv = process.argv;

    if (!!process.env.MONITOR_YAML_PATH) {
        return process.env.MONITOR_YAML_PATH;
    }

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === "--monitors") {
            return argv[i + 1];
        }
    }

    return MONITOR;
};
const LoadSitePath = function () {
    const argv = process.argv;

    if (!!process.env.SITE_YAML_PATH) {
        return process.env.SITE_YAML_PATH;
    }

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === "--site") {
            return argv[i + 1];
        }
    }

    return SITE;
};
//return given timestamp in UTC
const GetNowTimestampUTC = function () {
    //use js date instead of moment
    const now = new Date();
    const timestamp = now.getTime();
    return Math.floor(timestamp / 1000);
};
//return given timestamp minute start timestamp in UTC
const GetMinuteStartTimestampUTC = function (timestamp) {
    //use js date instead of moment
    const now = new Date(timestamp * 1000);
    const minuteStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0, 0);
    const minuteStartTimestamp = minuteStart.getTime();
    return Math.floor(minuteStartTimestamp / 1000);
};
//return current timestamp minute start timestamp in UTC
const GetMinuteStartNowTimestampUTC = function () {
    //use js date instead of moment
    const now = new Date();
    const minuteStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0, 0);
    const minuteStartTimestamp = minuteStart.getTime();
    return Math.floor(minuteStartTimestamp / 1000);
};
//return given timestamp day start timestamp in UTC
const GetDayStartTimestampUTC = function (timestamp) {
    //use js date instead of moment
    const now = new Date(timestamp * 1000);
    const dayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
    const dayStartTimestamp = dayStart.getTime();
    return Math.floor(dayStartTimestamp / 1000);
};
const GetDayEndTimestampUTC = function (timestamp) {
	//use js date instead of moment
	const now = new Date(timestamp * 1000);
	const dayEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
	const dayEndTimestamp = dayEnd.getTime();
	return Math.floor(dayEndTimestamp / 1000) + 60;
}
const DurationInMinutes = function (start, end) {
	return Math.floor((end - start) / 60);
}
const GetDayStartWithOffset = function (timeStampInSeconds, offsetInMinutes) {
    const then = new Date(GetMinuteStartTimestampUTC(timeStampInSeconds) * 1000);
    let dayStartThen = GetDayStartTimestampUTC(then.getTime() / 1000);
	let dayStartTomorrow = dayStartThen + 24 * 60 * 60;	
	let dayStartYesterday = dayStartThen - 24 * 60 * 60;	
    //have to figure out when to add a day
    //20-12AM 			[21-12AM] 	=21:630  xtm 	[22-12AM]   xtd	   =22:630 		23-12AM
	
	//if xtm - 330 >  1 day , add a day to xtm - 330
	 
    if (offsetInMinutes < 0) {
        //add one day to dayStartThen
        dayStartThen = dayStartThen + 24 * 60 * 60;
    }
    return dayStartThen + offsetInMinutes * 60;

    
}
const BeginingOfDay = (options = {}) => {
    const { date = new Date(), timeZone } = options;
    const parts = Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
    }).formatToParts(date);
    const hour = parseInt(parts.find((i) => i.type === "hour").value);
    const minute = parseInt(parts.find((i) => i.type === "minute").value);
    const second = parseInt(parts.find((i) => i.type === "second").value);
    const dt = new Date(1000 * Math.floor((date - hour * 3600000 - minute * 60000 - second * 1000) / 1000));
	return dt.getTime() / 1000;
};
export {
    IsValidURL,
    IsValidHTTPMethod,
    LoadMonitorsPath,
    LoadSitePath,
    GetMinuteStartTimestampUTC,
    GetNowTimestampUTC,
    GetDayStartTimestampUTC,
    GetMinuteStartNowTimestampUTC,
    DurationInMinutes,
    GetDayStartWithOffset,
    BeginingOfDay,
};

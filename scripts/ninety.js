import fs from "fs-extra";
import { GetMinuteStartNowTimestampUTC, BeginingOfDay } from "./tool.js";
import { StatusObj, ParseUptime } from "../src/lib/helpers.js";
function getDayMessage(type, numOfMinute){
	if(numOfMinute > 59){
		let hour = Math.floor(numOfMinute / 60);
		let minute = numOfMinute % 60;
		return `${type} for ${hour}h:${minute}m`;
	} else {
		return `${type} for ${numOfMinute} minute${numOfMinute > 1 ? "s" : ""}`;
	}
}

function getDayData(day0, startTime, endTime) {
    let dayData = {
        UP: 0,
        DEGRADED: 0,
        DOWN: 0,
        timestamp: startTime,
        cssClass: StatusObj.NO_DATA,
        message: "No Data",
    };
    //loop thorugh the ts range
    for (let i = startTime; i <= endTime; i += 60) {
        //if the ts is in the day0 then add up, down degraded data, if not initialize it
        if (day0[i] === undefined) {
            continue;
        }

        if (day0[i].status == "UP") {
            dayData.UP++;
        } else if (day0[i].status == "DEGRADED") {
            dayData.DEGRADED++;
        } else if (day0[i].status == "DOWN") {
            dayData.DOWN++;
        }
    }

    let cssClass = StatusObj.UP;
    let message = "Status OK";

    if (dayData.DEGRADED > 0) {
        cssClass = StatusObj.DEGRADED; 
        message = getDayMessage("Degraded", dayData.DEGRADED);
    }
    if (dayData.DOWN > 0) {
        cssClass = StatusObj.DOWN;
        message = getDayMessage("Down", dayData.DOWN);
    }
    if (dayData.DEGRADED + dayData.DOWN + dayData.UP > 0) {
        dayData.message = message;
        dayData.cssClass = cssClass;
    }

    return dayData;
}

const Ninety = async (monitor) => {
	let _0Day = {};
    let _90Day = {};
    let uptime0Day = "0";
    let dailyUps = 0;
    let dailyDown = 0;
    let dailyDegraded = 0;
    let completeUps = 0;
    let completeDown = 0;
    let completeDegraded = 0;

	const secondsInDay = 24 * 60 * 60;
	const now = GetMinuteStartNowTimestampUTC();  
	const midnight = BeginingOfDay({ timeZone: "GMT" });
    const midnight90DaysAgo = midnight - 90 * 24 * 60 * 60;
    const midnightTomorrow = midnight + secondsInDay;

	for (let i = midnight; i <= now; i += 60) {
        _0Day[i] = {
            timestamp: i,
            status: "NO_DATA",
            cssClass: StatusObj.NO_DATA,
            index: (i - midnight) / 60,
        };
    }

	let day0 = JSON.parse(fs.readFileSync(monitor.path0Day, "utf8"));

	for (const timestamp in day0) {
        const element = day0[timestamp];
        let status = element.status;
        if (status == "UP") {
            completeUps++;
        } else if (status == "DEGRADED") {
            completeDegraded++;
        } else if (status == "DOWN") {
            completeDown++;
        }
        //0 Day data
        if (_0Day[timestamp] !== undefined) {
            _0Day[timestamp].status = status;
            _0Day[timestamp].cssClass = StatusObj[status];

            dailyUps = status == "UP" ? dailyUps + 1 : dailyUps;
            dailyDown = status == "DOWN" ? dailyDown + 1 : dailyDown;
            dailyDegraded = status == "DEGRADED" ? dailyDegraded + 1 : dailyDegraded;
        }
    }

	for (let i = midnight90DaysAgo; i < midnightTomorrow; i += secondsInDay) {
        _90Day[i] = getDayData(day0, i, i + secondsInDay - 1);
    }

    for (const key in _90Day) {
        const element = _90Day[key];
        delete _90Day[key].UP;
        delete _90Day[key].DEGRADED;
        delete _90Day[key].DOWN;
        if (element.message == "No Data") continue;
    }
    uptime0Day = ParseUptime(dailyUps + dailyDegraded, dailyUps + dailyDown + dailyDegraded);

	const dataToWrite = {
        _90Day: _90Day,
        uptime0Day,
        uptime90Day: ParseUptime(completeUps + completeDegraded, completeUps + completeDegraded + completeDown),
        dailyUps,
        dailyDown,
        dailyDegraded,
    };

	await fs.writeJson(monitor.path90Day, dataToWrite);

	return true;

};

export { Ninety };
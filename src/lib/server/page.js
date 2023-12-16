// @ts-nocheck
// @ts-ignore
import fs from "fs-extra";
import { GetDayStartTimestampUTC, GetMinuteStartNowTimestampUTC, DurationInMinutes } from "../../../scripts/tool.js";
let statusObj = {
    UP: "api-up",
    DEGRADED: "api-degraded",
    DOWN: "api-down",
    NO_DATA: "api-nodata",
};

function parseUptime(up, all) {
    if (all === 0) return String("-");
    if (up == 0) return String("0");
    if (up == all) {
        return String(((up / all) * parseFloat(100)).toFixed(0));
    }
    return String(((up / all) * parseFloat(100)).toFixed(4));
}
function parsePercentage(n) {
    if (isNaN(n)) return "-";
    if (n == 0) {
        return "0";
    }
    if (n == 100) {
        return "100";
    }
    return n.toFixed(4);
}
const secondsInDay = 24 * 60 * 60;
const FetchData = async function (monitor) {
    let _0Day = {};
    let _90Day = {};
    let uptime0Day = "0";
    let dailyUps = 0;
    let dailyDown = 0;
    let percentage90DaysBuildUp = [];
    let latency90DaysBuildUp = [];
    let dailyDegraded = 0;
    let dailyLatencyBuildUp = [];

    const now = GetMinuteStartNowTimestampUTC();
    const midnight = GetDayStartTimestampUTC(now);
    const midnightTomorrow = midnight + secondsInDay;
    const minuteFromMidnightTillNow = DurationInMinutes(midnight, now);
    const midnight90DaysAgo = GetDayStartTimestampUTC(now - 90 * secondsInDay);

    for (let i = midnight; i <= now; i += 60) {
        let eachMin = i;
        _0Day[eachMin] = {
            timestamp: eachMin,
            status: "NO_DATA",
            cssClass: statusObj.NO_DATA,
            latency: "NA",
            index: i,
        };
    }
    for (let i = midnight90DaysAgo; i < midnightTomorrow; i += secondsInDay) {
        let eachDay = i;
        _90Day[eachDay] = {
            timestamp: eachDay,
            UP: 0,
            DEGRADED: 0,
            DOWN: 0,
            uptimePercentage: 0,
            avgLatency: 0,
            latency: 0,
            cssClass: statusObj.NO_DATA,
            message: "No Data",
        };
    }

    let day0 = JSON.parse(fs.readFileSync(monitor.path0Day, "utf8"));
    let _90DayFileData = JSON.parse(fs.readFileSync(monitor.path90Day, "utf8"));

	//loop 90DayFileData as object
    for (const timestamp in _90DayFileData) {
        let cssClass = statusObj.UP;
        let message = "Status OK";
        const element = _90DayFileData[timestamp];

        if (element === undefined) continue;

        if (_90Day[timestamp] === undefined) continue;

        _90Day[timestamp].UP = element.UP;
        _90Day[timestamp].DEGRADED = element.DEGRADED;
        _90Day[timestamp].DOWN = element.DOWN;
        _90Day[timestamp].avgLatency = element.avgLatency;
        _90Day[timestamp].latency = element.latency;

        _90Day[timestamp].uptimePercentage = parseUptime(element.UP + element.DEGRADED, element.UP + element.DEGRADED + element.DOWN);

        if (element.DEGRADED > 0) {
            cssClass = statusObj.DEGRADED;
            message = "Degraded for " + element.DEGRADED + " minutes";
        }

        if (element.DOWN > 0) {
            cssClass = statusObj.DOWN;
            message = "Down for " + element.DOWN + " minutes";
        }

        _90Day[timestamp].cssClass = cssClass;
        _90Day[timestamp].message = message;
    }
    //loop day0 as object
    for (const timestamp in day0) {
        const element = day0[timestamp];
        let status = element.status;
        let latency = element.latency;

        //0 Day data
        if (_0Day[timestamp] !== undefined) {
            _0Day[timestamp].status = status;
            _0Day[timestamp].cssClass = statusObj[status];
            _0Day[timestamp].latency = latency;

            dailyUps = status == "UP" ? dailyUps + 1 : dailyUps;
            dailyDown = status == "DOWN" ? dailyDown + 1 : dailyDown;
            dailyDegraded = status == "DEGRADED" ? dailyDegraded + 1 : dailyDegraded;
            dailyLatencyBuildUp.push(latency);
        }
    }

    for (const key in _90Day) {
        const element = _90Day[key];
        if (element.message == "No Data") continue;
        percentage90DaysBuildUp.push(parseFloat(element.uptimePercentage));
        latency90DaysBuildUp.push(parseFloat(element.avgLatency));
    }
    uptime0Day = parseUptime(dailyUps + dailyDegraded, dailyUps + dailyDown + dailyDegraded);
    return {
        _0Day: _0Day,
        _90Day: _90Day,
        uptime0Day,
        uptime90Day: parsePercentage(percentage90DaysBuildUp.reduce((a, b) => a + b, 0) / percentage90DaysBuildUp.length),
        avgLatency90Day: latency90DaysBuildUp.length > 0 ? (latency90DaysBuildUp.reduce((a, b) => a + b, 0) / latency90DaysBuildUp.length).toFixed(0) : "-",
        avgLatency0Day: dailyLatencyBuildUp.length > 0 ? (dailyLatencyBuildUp.reduce((a, b) => a + b, 0) / dailyLatencyBuildUp.length).toFixed(0) : "-",
        dailyUps,
        dailyDown,
        dailyDegraded,
    };
};
export { FetchData };

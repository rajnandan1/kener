// @ts-nocheck
// @ts-ignore
import { json } from "@sveltejs/kit";
import fs from "fs-extra";
import moment from "moment-timezone";
let statusObj = {
    UP: "api-up",
    DEGRADED: "api-degraded",
    DOWN: "api-down",
    NO_DATA: "api-nodata",
};

function parseUptime(up, all) {
    if (up == all) {
        return String(((up / all) * parseFloat(100)).toFixed(0));
    }
    return String(((up / all) * parseFloat(100)).toFixed(4));
}
function parsePercentage(n) {
    if (n == 0) {
        return "0";
    }
    if (n == 100) {
        return "100";
    }
    return n.toFixed(4);
}
export async function POST({ request }) {
    const payload = await request.json();
    const tz = payload.tz;

    let _0Day = {};
    let _90Day = {};
    let uptime0Day = "0";
    let dailyUps = 0;
    let dailyDown = 0;
    let percentage90DaysBuildUp = [];
    let latency90DaysBuildUp = [];
    let dailyDegraded = 0;
    let dailyLatencyBuildUp = [];
    const now = moment.tz(tz);
    let minuteFromMidnightTillNow = now.diff(now.clone().startOf("day"), "minutes");
	const midnight90DaysAgo = now.clone().subtract(90, "days").startOf("day");
    for (let i = 0; i <= minuteFromMidnightTillNow; i++) {
        let eachMin = moment.tz(tz).startOf("day").add(i, "minutes").format("YYYY-MM-DD HH:mm:00");
        _0Day[eachMin] = {
            timestamp: eachMin,
            status: "NO_DATA",
            cssClass: statusObj.NO_DATA,
            latency: "NA",
            index: i,
        };
    }
	for (let i = 0; i <= 90; i++) {
		let eachDay = midnight90DaysAgo.clone().add(i, "days").format("YYYY-MM-DD");
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

    let day0 = JSON.parse(fs.readFileSync(payload.day0, "utf8"));

	//loop day0 as object
	for (const timestampISO in day0) {
		if (Object.hasOwnProperty.call(day0, timestampISO)) {
			const element = day0[timestampISO];
			let min = moment.tz(timestampISO, tz).format("YYYY-MM-DD HH:mm:00");
			let day = moment.tz(timestampISO, tz).format("YYYY-MM-DD");
			let status = element.status;
            let latency = element.latency;

			//90 Day data
			let d = _90Day[day];
            _90Day[day] = {
                timestamp: day,
                UP: status == "UP" ? d.UP + 1 : d.UP,
                DEGRADED: status == "DEGRADED" ? d.DEGRADED + 1 : d.DEGRADED,
                DOWN: status == "DOWN" ? d.DOWN + 1 : d.DOWN,
                latency: d.latency + latency,
                avgLatency: ((d.latency + latency) / (d.UP + d.DEGRADED + d.DOWN + 1)).toFixed(0),
            };
			_90Day[day].uptimePercentage = parseUptime(_90Day[day].UP + _90Day[day].DEGRADED, _90Day[day].UP + _90Day[day].DEGRADED + _90Day[day].DOWN);
			
			let cssClass = statusObj.UP;
            let message = "OK";

            if (_90Day[day].DEGRADED > 0) {
                cssClass = statusObj.DEGRADED;
                message = "Degraded for " + _90Day[day].DEGRADED + " minutes";
            }

            if (_90Day[day].DOWN > 0) {
                cssClass = statusObj.DOWN;
                message = "Down for " + _90Day[day].DOWN + " minutes";
            }

            _90Day[day].cssClass = cssClass;
            _90Day[day].message = message;

			//0 Day data
			if (_0Day[min] !== undefined) {
                _0Day[min].status = status;
                _0Day[min].cssClass = statusObj[status];
                _0Day[min].latency = latency;

                dailyUps = status == "UP" ? dailyUps + 1 : dailyUps;
                dailyDown = status == "DOWN" ? dailyDown + 1 : dailyDown;
                dailyDegraded = status == "DEGRADED" ? dailyDegraded + 1 : dailyDegraded;
                dailyLatencyBuildUp.push(latency);
            }
		}
	}

    
    for (const key in _90Day) {
        if (Object.hasOwnProperty.call(_90Day, key)) {
            const element = _90Day[key];
			if(element.message == "No Data") continue;
            percentage90DaysBuildUp.push(parseFloat(element.uptimePercentage));
            latency90DaysBuildUp.push(parseFloat(element.avgLatency));
        }
    }
    uptime0Day = parseUptime(dailyUps + dailyDegraded, dailyUps + dailyDown + dailyDegraded);
    return json({
        _0Day: _0Day,
        _90Day: _90Day,
        uptime0Day,
        uptime90Day: parsePercentage(percentage90DaysBuildUp.reduce((a, b) => a + b, 0) / percentage90DaysBuildUp.length),
        avgLatency90Day: (latency90DaysBuildUp.reduce((a, b) => a + b, 0) / latency90DaysBuildUp.length).toFixed(0),
        avgLatency0Day: (dailyLatencyBuildUp.reduce((a, b) => a + b, 0) / dailyLatencyBuildUp.length).toFixed(0),
        dailyUps,
        dailyDown,
        dailyDegraded,
    });
}

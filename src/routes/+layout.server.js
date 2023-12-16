import fs from "fs-extra";
import { env } from "$env/dynamic/public";
import { GetDayStartTimestampUTC, GetMinuteStartNowTimestampUTC, DurationInMinutes } from "../../scripts/tool.js";
var dt = new Date();
let tz = dt.getTimezoneOffset(); 
let startTodayAtTs = GetDayStartTimestampUTC(GetMinuteStartNowTimestampUTC()) + tz * 60;
let start90DayAtTs = startTodayAtTs - 90*24*60*60;
export async function load({ params, route, url }) {
	let site = JSON.parse(fs.readFileSync(env.PUBLIC_KENER_FOLDER + "/site.json", "utf8"));
    return {
        site: site,
        timezone: tz,
        startTodayAtTs: startTodayAtTs,
        start90DayAtTs: start90DayAtTs,
    };
}

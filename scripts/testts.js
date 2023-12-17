import { GetNowTimestampUTC, GetMinuteStartTimestampUTC, GetMinuteStartNowTimestampUTC, GetDayStartTimestampUTC } from "./tool.js";

let ts = GetNowTimestampUTC();
console.log("GetNowTimestampUTC: " + ts);
let tm = GetMinuteStartTimestampUTC(ts);
console.log("GetMinuteStartTimestampUTC: " + tm);
let tms = GetMinuteStartNowTimestampUTC();
console.log("GetMinuteStartNowTimestampUTC: " + tms);
let td = GetDayStartTimestampUTC(ts);
console.log("GetDayStartTimestampUTC: " + td);
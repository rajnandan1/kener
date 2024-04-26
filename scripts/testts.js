import { GetMinuteStartNowTimestampUTC, GetDayStartWithOffset, BeginningOfDay } from "./tool.js";
let tzOffset = -330;
let ts = GetMinuteStartNowTimestampUTC();
console.log("GetMinuteStartNowTimestampUTC India 12AM: " + ts);
let tm = GetDayStartWithOffset(GetMinuteStartNowTimestampUTC(), tzOffset);
console.log("GetMinuteStartTimestampUTC India 12AM: should be  18:30PM " + tm);
console.log(`getUTCTimestampAtStartOfDayForOffset(${GetMinuteStartNowTimestampUTC()}, ${tzOffset})`);



console.log(BeginningOfDay({ timeZone: "GMT" }));
console.log(BeginningOfDay({ timeZone: "Asia/Kolkata", date: new Date(1703223388000) }));
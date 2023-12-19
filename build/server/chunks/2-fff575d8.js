import { a as activeIncident, m as mapper } from './incident2-deedf712.js';
import fs from 'fs-extra';
import { a as GetMinuteStartNowTimestampUTC, G as GetDayStartTimestampUTC } from './tool-e3bbdd70.js';
import { S as StatusObj } from './helpers-fc56b344.js';
import { p as public_env } from './shared-server-58a5f352.js';
import 'axios';
import 'moment';
import '@markdoc/markdoc';

function parseUptime(up, all) {
  if (all === 0)
    return String("-");
  if (up == 0)
    return String("0");
  if (up == all) {
    return String((up / all * parseFloat(100)).toFixed(0));
  }
  return String((up / all * parseFloat(100)).toFixed(4));
}
function parsePercentage(n) {
  if (isNaN(n))
    return "-";
  if (n == 0) {
    return "0";
  }
  if (n == 100) {
    return "100";
  }
  return n.toFixed(4);
}
const secondsInDay = 24 * 60 * 60;
function getDayData(day0, startTime, endTime) {
  let dayData = {
    UP: 0,
    DEGRADED: 0,
    DOWN: 0,
    timestamp: startTime,
    cssClass: StatusObj.NO_DATA,
    message: "No Data"
  };
  for (let i = startTime; i <= endTime; i += 60) {
    if (day0[i] === void 0) {
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
  dayData.uptimePercentage = parseUptime(dayData.UP + dayData.DEGRADED, dayData.UP + dayData.DEGRADED + dayData.DOWN);
  let cssClass = StatusObj.UP;
  let message = "Status OK";
  if (dayData.DEGRADED > 0) {
    cssClass = StatusObj.DEGRADED;
    message = "Degraded for " + dayData.DEGRADED + " minutes";
  }
  if (dayData.DOWN > 0) {
    cssClass = StatusObj.DOWN;
    message = "Down for " + dayData.DOWN + " minutes";
  }
  if (dayData.DEGRADED + dayData.DOWN + dayData.UP > 0) {
    dayData.message = message;
    dayData.cssClass = cssClass;
  }
  return dayData;
}
const FetchData = async function(monitor, midnight, midnight90DaysAgo, tzOffset) {
  let _0Day = {};
  let _90Day = {};
  let uptime0Day = "0";
  let dailyUps = 0;
  let dailyDown = 0;
  let percentage90DaysBuildUp = [];
  let dailyDegraded = 0;
  const now = GetMinuteStartNowTimestampUTC() - tzOffset * 60;
  midnight = GetDayStartTimestampUTC(now);
  midnight90DaysAgo = midnight - 90 * 24 * 60 * 60;
  const midnightTomorrow = midnight + secondsInDay;
  for (let i = midnight; i <= now; i += 60) {
    _0Day[i] = {
      timestamp: i + tzOffset * 60,
      status: "NO_DATA",
      cssClass: StatusObj.NO_DATA,
      index: (i - midnight) / 60
    };
  }
  let day0UTC = JSON.parse(fs.readFileSync(monitor.path0Day, "utf8"));
  let day0 = {};
  for (const timestampUTC in day0UTC) {
    const element = day0UTC[timestampUTC];
    element.timestamp = parseInt(timestampUTC) - tzOffset * 60;
    day0[parseInt(timestampUTC) - tzOffset * 60] = element;
  }
  for (const timestamp in day0) {
    const element = day0[timestamp];
    let status = element.status;
    if (_0Day[timestamp] !== void 0) {
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
    if (element.message == "No Data")
      continue;
    percentage90DaysBuildUp.push(parseFloat(element.uptimePercentage));
  }
  uptime0Day = parseUptime(dailyUps + dailyDegraded, dailyUps + dailyDown + dailyDegraded);
  return {
    _0Day,
    _90Day,
    uptime0Day,
    uptime90Day: parsePercentage(percentage90DaysBuildUp.reduce((a, b) => a + b, 0) / percentage90DaysBuildUp.length),
    dailyUps,
    dailyDown,
    dailyDegraded
  };
};
async function load({ params, route, url, parent }) {
  let monitors = JSON.parse(fs.readFileSync(public_env.PUBLIC_KENER_FOLDER + "/monitors.json", "utf8"));
  const parentData = await parent();
  const siteData = parentData.site;
  const github = siteData.github;
  for (let i = 0; i < monitors.length; i++) {
    const gitHubActiveIssues = await activeIncident(monitors[i].tag, github);
    let data = await FetchData(monitors[i], parentData.startTodayAtTs, parentData.start90DayAtTs, parentData.tzOffset);
    monitors[i].pageData = data;
    monitors[i].activeIncidents = await Promise.all(gitHubActiveIssues.map(mapper, { github }));
  }
  return {
    monitors
  };
}

var _page_server = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 2;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-51a6ff32.js')).default;
const server_id = "src/routes/+page.server.js";
const imports = ["_app/immutable/nodes/2.a095b352.js","_app/immutable/chunks/scheduler.ea4d12df.js","_app/immutable/chunks/index.12c4b772.js","_app/immutable/chunks/globals.7f7f1b26.js","_app/immutable/chunks/incident.1bd69fe5.js","_app/immutable/chunks/index.06f948c6.js","_app/immutable/chunks/index.7ea6c3d8.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server as server, server_id, stylesheets };
//# sourceMappingURL=2-fff575d8.js.map

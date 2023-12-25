import { G as GetIncidents, M as Mapper } from './github-e1662b86.js';
import fs from 'fs-extra';
import { G as GetMinuteStartNowTimestampUTC, B as BeginingOfDay } from './tool-153dc604.js';
import { S as StatusObj, P as ParseUptime, a as ParsePercentage } from './helpers-eac5677c.js';
import { p as public_env } from './shared-server-58a5f352.js';
import 'axios';
import '@markdoc/markdoc';

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
  dayData.uptimePercentage = ParseUptime(dayData.UP + dayData.DEGRADED, dayData.UP + dayData.DEGRADED + dayData.DOWN);
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
const FetchData = async function(monitor, localTz) {
  let _0Day = {};
  let _90Day = {};
  let uptime0Day = "0";
  let dailyUps = 0;
  let dailyDown = 0;
  let percentage90DaysBuildUp = [];
  let dailyDegraded = 0;
  const now = GetMinuteStartNowTimestampUTC();
  const midnight = BeginingOfDay({ timeZone: localTz });
  const midnight90DaysAgo = midnight - 90 * 24 * 60 * 60;
  const midnightTomorrow = midnight + secondsInDay;
  for (let i = midnight; i <= now; i += 60) {
    _0Day[i] = {
      timestamp: i,
      status: "NO_DATA",
      cssClass: StatusObj.NO_DATA,
      index: (i - midnight) / 60
    };
  }
  let day0 = JSON.parse(fs.readFileSync(monitor.path0Day, "utf8"));
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
    const uptimePercentage = element.uptimePercentage;
    delete _90Day[key].UP;
    delete _90Day[key].DEGRADED;
    delete _90Day[key].DOWN;
    delete _90Day[key].uptimePercentage;
    if (element.message == "No Data")
      continue;
    percentage90DaysBuildUp.push(parseFloat(uptimePercentage));
  }
  uptime0Day = ParseUptime(dailyUps + dailyDegraded, dailyUps + dailyDown + dailyDegraded);
  return {
    _90Day,
    uptime0Day,
    uptime90Day: ParsePercentage(percentage90DaysBuildUp.reduce((a, b) => a + b, 0) / percentage90DaysBuildUp.length),
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
    const gitHubActiveIssues = await GetIncidents(monitors[i].tag, github, "open");
    delete monitors[i].api;
    delete monitors[i].defaultStatus;
    let data = await FetchData(monitors[i], parentData.localTz);
    monitors[i].pageData = data;
    monitors[i].activeIncidents = await Promise.all(gitHubActiveIssues.map(Mapper, { github }));
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
const component = async () => component_cache ??= (await import('./_page.svelte-312ab1e2.js')).default;
const server_id = "src/routes/+page.server.js";
const imports = ["_app/immutable/nodes/2.6dabdebd.js","_app/immutable/chunks/scheduler.1b18627c.js","_app/immutable/chunks/index.a0ccbbe4.js","_app/immutable/chunks/each.e59479a4.js","_app/immutable/chunks/card-content.02ecb8a3.js","_app/immutable/chunks/incident.4ef4dd12.js","_app/immutable/chunks/index.2f5200cf.js","_app/immutable/chunks/index.3e0e01a3.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server as server, server_id, stylesheets };
//# sourceMappingURL=2-3c01972e.js.map

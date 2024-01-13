import { G as GetIncidents, M as Mapper } from './github-54c09baa.js';
import fs from 'fs-extra';
import { G as GetMinuteStartNowTimestampUTC, B as BeginingOfDay } from './tool-153dc604.js';
import { S as StatusObj, P as ParseUptime, a as ParsePercentage } from './helpers-6076deb3.js';
import { p as public_env } from './shared-server-58a5f352.js';
import 'axios';
import 'marked';

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
  const monitorsActive = [];
  for (let i = 0; i < monitors.length; i++) {
    if (monitors[i].hidden !== void 0 && monitors[i].hidden === true) {
      continue;
    }
    const gitHubActiveIssues = await GetIncidents(monitors[i].tag, github, "open");
    delete monitors[i].api;
    delete monitors[i].defaultStatus;
    let data = await FetchData(monitors[i], parentData.localTz);
    monitors[i].pageData = data;
    monitors[i].activeIncidents = await Promise.all(gitHubActiveIssues.map(Mapper, { github }));
    monitorsActive.push(monitors[i]);
  }
  return {
    monitors: monitorsActive
  };
}

var _page_server = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 2;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-5ba981ef.js')).default;
const server_id = "src/routes/+page.server.js";
const imports = ["_app/immutable/nodes/2.5aa6b425.js","_app/immutable/chunks/scheduler.0e55af49.js","_app/immutable/chunks/index.7fa4eb0f.js","_app/immutable/chunks/ctx.b7ea881a.js","_app/immutable/chunks/index.3cd3e9b4.js","_app/immutable/chunks/incident.99422fec.js","_app/immutable/chunks/chevron-down.2b71fd98.js","_app/immutable/chunks/index.8cfb104d.js"];
const stylesheets = ["_app/immutable/assets/2.0606e7ca.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server as server, server_id, stylesheets };
//# sourceMappingURL=2-fef2986e.js.map

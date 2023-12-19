import fs from 'fs-extra';
import { p as public_env } from './shared-server-58a5f352.js';
import { G as GetDayStartTimestampUTC, a as GetMinuteStartNowTimestampUTC } from './tool-e3bbdd70.js';
import 'moment';

async function load({ params, route, url, cookies }) {
  let site = JSON.parse(fs.readFileSync(public_env.PUBLIC_KENER_FOLDER + "/site.json", "utf8"));
  var dt = /* @__PURE__ */ new Date();
  let tzOffset = dt.getTimezoneOffset();
  const tzOffsetCookie = cookies.get("tzOffset");
  if (!!tzOffsetCookie) {
    tzOffset = Number(tzOffsetCookie);
  }
  let startTodayAtTs = GetDayStartTimestampUTC(GetMinuteStartNowTimestampUTC());
  let start90DayAtTs = startTodayAtTs - 90 * 24 * 60 * 60;
  console.log("Times are");
  console.log("UTC Minute start now: " + GetMinuteStartNowTimestampUTC());
  console.log("UTC Day start now: " + GetDayStartTimestampUTC(GetMinuteStartNowTimestampUTC()));
  console.log("TZ Day start today: " + startTodayAtTs);
  console.log("TZ Day start 90 days ago: " + start90DayAtTs);
  return {
    site,
    tzOffset,
    startTodayAtTs,
    start90DayAtTs
  };
}

var _layout_server = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 0;
let component_cache;
const component = async () => component_cache ??= (await import('./_layout.svelte-5d2a766d.js')).default;
const server_id = "src/routes/+layout.server.js";
const imports = ["_app/immutable/nodes/0.a89a36a1.js","_app/immutable/chunks/scheduler.ea4d12df.js","_app/immutable/chunks/index.12c4b772.js","_app/immutable/chunks/globals.7f7f1b26.js","_app/immutable/chunks/index.06f948c6.js","_app/immutable/chunks/index.7ea6c3d8.js"];
const stylesheets = ["_app/immutable/assets/0.79266d14.css"];
const fonts = [];

export { component, fonts, imports, index, _layout_server as server, server_id, stylesheets };
//# sourceMappingURL=0-f4d10a94.js.map

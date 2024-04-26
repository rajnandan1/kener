import fs from 'fs-extra';
import { j as json } from './index-d7f43214.js';
import { b as GetMinuteStartNowTimestampUTC, B as BeginningOfDay } from './tool-53f63ca6.js';
import { S as StatusObj } from './helpers-0acb6e43.js';

async function POST({ request }) {
  const payload = await request.json();
  const monitor = payload.monitor;
  const localTz = payload.localTz;
  let _0Day = {};
  const now = GetMinuteStartNowTimestampUTC();
  const midnight = BeginningOfDay({ timeZone: localTz });
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
    }
  }
  return json(_0Day);
}

export { POST };
//# sourceMappingURL=_server-f0054287.js.map

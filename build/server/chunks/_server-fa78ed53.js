import { j as json } from './index-2b68e648.js';
import fs from 'fs-extra';
import { p as public_env } from './shared-server-58a5f352.js';
import moment from 'moment';
import Randomstring from 'randomstring';

const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN;
const WEBHOOK_IP = process.env.WEBHOOK_IP;
const store = function(data, authHeader, ip) {
  const tag = data.tag;
  const authToken = authHeader.replace("Bearer ", "");
  if (authToken !== WEBHOOK_TOKEN) {
    return { error: "invalid token", status: 401 };
  }
  if (WEBHOOK_IP !== void 0 && ip != "" && ip !== WEBHOOK_IP) {
    return { error: "invalid ip", status: 401 };
  }
  const resp = {};
  if (data.status === void 0 || ["UP", "DOWN", "DEGRADED"].indexOf(data.status) === -1) {
    return { error: "status missing", status: 400 };
  }
  if (data.latency === void 0 || isNaN(data.latency)) {
    return { error: "latency missing or not a number", status: 400 };
  }
  if (data.timestampInSeconds !== void 0 && isNaN(data.timestampInSeconds)) {
    return { error: "timestampInSeconds not a number", status: 400 };
  }
  if (data.timestampInSeconds === void 0) {
    data.timestampInSeconds = Math.floor(Date.now() / 1e3);
  }
  resp.status = data.status;
  resp.latency = data.latency;
  resp.type = "webhook";
  let timestampISO = moment().toISOString();
  try {
    timestampISO = moment.unix(data.timestampInSeconds).toISOString();
    if (moment(timestampISO).isAfter(moment().add(1, "minute"))) {
      throw new Error("timestampInSeconds is in future");
    }
    if (moment(timestampISO).isBefore(moment().subtract(90, "days"))) {
      throw new Error("timestampInSeconds is older than 90days");
    }
  } catch (err) {
    return { error: err.message, status: 400 };
  }
  let tags = [];
  let monitors = [];
  try {
    monitors = JSON.parse(fs.readFileSync(public_env.PUBLIC_KENER_FOLDER + "/monitors.json", "utf8"));
    tags = monitors.map((monitor2) => monitor2.tag);
    if (tags.indexOf(tag) == -1) {
      throw new Error("not a valid tag");
    }
  } catch (err) {
    return { error: err.message, status: 400 };
  }
  const monitor = monitors.find((monitor2) => monitor2.tag === tag);
  let day0 = {};
  let timeStampISOMinute = moment(timestampISO).startOf("minute").toISOString();
  day0[timeStampISOMinute] = resp;
  fs.writeFileSync(public_env.PUBLIC_KENER_FOLDER + `/${monitor.folderName}.webhook.${Randomstring.generate()}.json`, JSON.stringify(day0, null, 2));
  return { status: 200, message: "success at " + timeStampISOMinute };
};
async function POST({ request }) {
  const payload = await request.json();
  const authorization = request.headers.get("authorization");
  let ip = "";
  try {
    ip = request.headers.get("x-forwarded-for") || request.socket.remoteAddress || request.headers.get("x-real-ip");
  } catch (err) {
    console.log("IP Not Found " + err.message);
  }
  let resp = store(payload, authorization, ip);
  return json(resp, {
    status: resp.status
  });
}

export { POST };
//# sourceMappingURL=_server-fa78ed53.js.map

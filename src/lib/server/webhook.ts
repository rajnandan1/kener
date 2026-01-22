import {
  GetMinuteStartNowTimestampUTC,
  GetNowTimestampUTC,
  GetMinuteStartTimestampUTC,
  ParseUptime,
  GetDayStartTimestampUTC,
} from "./tool.js";
import db from "./db/db.js";
import { WEBHOOK } from "./constants.js";

import { GetMonitors, VerifyAPIKey, InsertMonitoringData } from "./controllers/controller.js";

const GetAllTags = async function () {
  let tags = [];
  let monitors = [];
  try {
    monitors = await GetMonitors({
      status: "ACTIVE",
    });
    tags = monitors.map((monitor) => monitor.tag);
  } catch (err) {
    return [];
  }
  return tags;
};
const CheckIfValidTag = async function (tag: string): Promise<boolean> {
  try {
    let monitor = await db.getMonitorByTag(tag);
    if (!!!monitor) {
      throw new Error("not a valid tag");
    }
    if (monitor.status != "ACTIVE") {
      throw new Error("monitor is not active");
    }
  } catch (err) {
    return false;
  }
  return true;
};
const auth = async function (request: Request): Promise<Error | null> {
  const authHeader = request.headers.get("authorization");
  const authToken = authHeader?.replace("Bearer ", "");

  if (!authToken || (await VerifyAPIKey(authToken)) === false) {
    return new Error("invalid token");
  }

  return null;
};
interface StoreData {
  tag: string;
  status?: string;
  latency?: number;
  timestampInSeconds?: number;
}

interface StoreResponse {
  status: string;
  latency: number;
  type: string;
}

const store = async function (data: StoreData): Promise<{ error?: string; status: number; message?: string }> {
  const tag = data.tag;
  //remove Bearer from start in authHeader

  const resp: StoreResponse = {
    status: "",
    latency: 0,
    type: "",
  };
  if (data.status === undefined || ["UP", "DOWN", "DEGRADED"].indexOf(data.status) === -1) {
    return { error: "status missing", status: 400 };
  }
  if (data.latency === undefined || isNaN(data.latency)) {
    return { error: "latency missing or not a number", status: 400 };
  }
  if (data.timestampInSeconds !== undefined && isNaN(data.timestampInSeconds)) {
    return { error: "timestampInSeconds not a number", status: 400 };
  }
  if (data.timestampInSeconds === undefined) {
    data.timestampInSeconds = GetNowTimestampUTC();
  }
  data.timestampInSeconds = GetMinuteStartTimestampUTC(data.timestampInSeconds);
  resp.status = data.status;
  resp.latency = data.latency;
  resp.type = WEBHOOK;
  let timestamp = GetMinuteStartNowTimestampUTC();
  try {
    //throw error if timestamp is future or older than 90days
    if (data.timestampInSeconds! > timestamp) {
      throw new Error("timestampInSeconds is in future");
    }
    //past 90 days only
    if (timestamp - data.timestampInSeconds! > 90 * 24 * 60 * 60) {
      throw new Error("timestampInSeconds is older than 90days");
    }
  } catch (err: unknown) {
    return { error: (err as Error).message, status: 400 };
  }
  //check if tag is valid
  let monitor = await db.getMonitorByTag(tag);
  if (!!!monitor) {
    return { error: "no monitor with tag found", status: 400 };
  }
  if (monitor.status != "ACTIVE") {
    return { error: "monitor with the given tag is not active", status: 400 };
  }

  //get the monitor object matching the tag

  await InsertMonitoringData({
    monitor_tag: tag,
    timestamp: data.timestampInSeconds,
    status: resp.status,
    latency: resp.latency,
    type: "webhook",
  });
  return { status: 200, message: "success at " + data.timestampInSeconds };
};

interface MonitorStatusResponse {
  error?: string;
  status: number | string | null;
  uptime?: string | null;
  last_updated_at?: number | null;
  monitorStatus?: string | null;
}

const GetMonitorStatusByTag = async function (tag: string, timestamp?: number | null): Promise<MonitorStatusResponse> {
  let monitor = await db.getMonitorByTag(tag);
  if (!!!monitor) {
    return { error: "no monitor with tag found", status: 400 };
  }
  if (monitor.status != "ACTIVE") {
    return { error: "monitor with the given tag is not active", status: 400 };
  }
  const resp: { uptime: string | null; last_updated_at: number | null; monitorStatus: string | null } = {
    uptime: null,
    last_updated_at: null,
    monitorStatus: null,
  };

  const { include_degraded_in_downtime } = monitor;

  let now = GetMinuteStartNowTimestampUTC();
  if (timestamp !== null && timestamp !== undefined) {
    now = timestamp;
  }
  let start = GetDayStartTimestampUTC(now);

  let dayDataNew = await db.getMonitoringData(tag, start, now);
  let ups = 0;
  let downs = 0;
  let degradeds = 0;
  let lastData = dayDataNew[dayDataNew.length - 1];

  for (let i = 0; i < dayDataNew.length; i++) {
    let row = dayDataNew[i];
    if (row.status == "UP") {
      ups++;
    } else if (row.status == "DEGRADED") {
      degradeds++;
    } else if (row.status == "DOWN") {
      downs++;
    }
  }
  let numerator = ups + degradeds;
  if (include_degraded_in_downtime === "YES") {
    numerator = ups;
  }

  resp.uptime = ParseUptime(numerator, ups + degradeds + downs);
  resp.last_updated_at = Number(lastData.timestamp);
  resp.monitorStatus = lastData.status;
  return { status: 200, uptime: resp.uptime, last_updated_at: resp.last_updated_at, monitorStatus: resp.monitorStatus };
};
export { store, auth, CheckIfValidTag, GetAllTags, GetMonitorStatusByTag };

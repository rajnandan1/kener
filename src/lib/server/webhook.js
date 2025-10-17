// @ts-nocheck
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
const CheckIfValidTag = async function (tag) {
  let tags = [];
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
const auth = async function (request) {
  const authHeader = request.headers.get("authorization");
  const authToken = authHeader?.replace("Bearer ", "");

  if ((await VerifyAPIKey(authToken)) === false) {
    return new Error("invalid token");
  }

  return null;
};
const store = async function (data) {
  const tag = data.tag;
  //remove Bearer from start in authHeader

  const resp = {};
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
    if (data.timestampInSeconds > timestamp) {
      throw new Error("timestampInSeconds is in future");
    }
    //past 90 days only
    if (timestamp - data.timestampInSeconds > 90 * 24 * 60 * 60) {
      throw new Error("timestampInSeconds is older than 90days");
    }
  } catch (err) {
    return { error: err.message, status: 400 };
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

const GetMonitorStatusByTag = async function (tag, timestamp, startDate, endDate) {
  let monitor = await db.getMonitorByTag(tag);
  if (!!!monitor) {
    return { error: "no monitor with tag found", status: 400 };
  }
  if (monitor.status != "ACTIVE") {
    return { error: "monitor with the given tag is not active", status: 400 };
  }
  const resp = {
    status: null,
    uptime: null,
    last_updated_at: null,
    time_range: {
      start: null,
      end: null
    }
  };

  const { include_degraded_in_downtime } = monitor;

  let now = GetMinuteStartNowTimestampUTC();
  if (timestamp !== null && timestamp !== undefined) {
    now = timestamp;
  }
  
  let start, end;
  
  // Handle date range parameters
  if (startDate && endDate) {
    // Parse start_date and end_date (expecting YYYY-MM-DD format)
    try {
      const startDateObj = new Date(startDate + 'T00:00:00.000Z');
      const endDateObj = new Date(endDate + 'T23:59:59.999Z');
      
      if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        return { error: "Invalid date format. Use YYYY-MM-DD", status: 400 };
      }
      
      if (startDateObj > endDateObj) {
        return { error: "start_date must be before or equal to end_date", status: 400 };
      }
      
      start = Math.floor(startDateObj.getTime() / 1000);
      end = Math.floor(endDateObj.getTime() / 1000);
    } catch (err) {
      return { error: "Invalid date format. Use YYYY-MM-DD", status: 400 };
    }
  } else if (startDate && !endDate) {
    // If only start_date is provided, use it as start and current time as end
    try {
      const startDateObj = new Date(startDate + 'T00:00:00.000Z');
      if (isNaN(startDateObj.getTime())) {
        return { error: "Invalid start_date format. Use YYYY-MM-DD", status: 400 };
      }
      start = Math.floor(startDateObj.getTime() / 1000);
      end = now;
    } catch (err) {
      return { error: "Invalid start_date format. Use YYYY-MM-DD", status: 400 };
    }
  } else if (!startDate && endDate) {
    // If only end_date is provided, use start of that day as start
    try {
      const endDateObj = new Date(endDate + 'T23:59:59.999Z');
      if (isNaN(endDateObj.getTime())) {
        return { error: "Invalid end_date format. Use YYYY-MM-DD", status: 400 };
      }
      start = GetDayStartTimestampUTC(Math.floor(endDateObj.getTime() / 1000));
      end = Math.floor(endDateObj.getTime() / 1000);
    } catch (err) {
      return { error: "Invalid end_date format. Use YYYY-MM-DD", status: 400 };
    }
  } else {
    // Default behavior: current day
    start = GetDayStartTimestampUTC(now);
    end = now;
  }

  // Set time range in response
  resp.time_range.start = start;
  resp.time_range.end = end;

  let dayDataNew = await db.getMonitoringData(tag, start, end);
  
  if (dayDataNew.length === 0) {
    return { 
      status: 200, 
      ...resp,
      status: null,
      uptime: null,
      last_updated_at: null,
      message: "No data available for the specified time range"
    };
  }
  
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
  resp.status = lastData.status;
  return { status: 200, ...resp };
};
export { store, auth, CheckIfValidTag, GetAllTags, GetMonitorStatusByTag };

import fs from 'fs-extra';
import { p as public_env } from './shared-server-58a5f352.js';
import { P as ParseUptime } from './helpers-0acb6e43.js';
import { G as GetNowTimestampUTC, a as GetMinuteStartTimestampUTC, b as GetMinuteStartNowTimestampUTC } from './tool-b4b3e524.js';
import { e as GetStartTimeFromBody, f as GetEndTimeFromBody } from './github-31d08953.js';
import Randomstring from 'randomstring';

const API_TOKEN = process.env.API_TOKEN;
const API_IP = process.env.API_IP;
const GetAllTags = function() {
  let tags = [];
  let monitors = [];
  try {
    monitors = JSON.parse(fs.readFileSync(public_env.PUBLIC_KENER_FOLDER + "/monitors.json", "utf8"));
    tags = monitors.map((monitor) => monitor.tag);
  } catch (err) {
    return [];
  }
  return tags;
};
const CheckIfValidTag = function(tag) {
  let tags = [];
  let monitors = [];
  try {
    monitors = JSON.parse(fs.readFileSync(public_env.PUBLIC_KENER_FOLDER + "/monitors.json", "utf8"));
    tags = monitors.map((monitor) => monitor.tag);
    if (tags.indexOf(tag) == -1) {
      throw new Error("not a valid tag");
    }
  } catch (err) {
    return false;
  }
  return true;
};
const auth = function(request) {
  const authHeader = request.headers.get("authorization");
  const authToken = authHeader.replace("Bearer ", "");
  let ip = "";
  try {
    if (request.headers.get("x-forwarded-for") !== null) {
      ip = request.headers.get("x-forwarded-for").split(",")[0];
    } else if (request.headers.get("x-real-ip") !== null) {
      ip = request.headers.get("x-real-ip");
    } else if (request.connection && request.connection.remoteAddress !== null) {
      ip = request.connection.remoteAddress;
    } else if (request.socket && request.socket.remoteAddress !== null) {
      ip = request.socket.remoteAddress;
    }
  } catch (err) {
    console.log("IP Not Found " + err.message);
  }
  if (authToken !== API_TOKEN) {
    return new Error("invalid token");
  }
  if (API_IP !== void 0 && ip != "" && ip !== API_IP) {
    return new Error("invalid ip");
  }
  return null;
};
const store = function(data) {
  const tag = data.tag;
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
    data.timestampInSeconds = GetNowTimestampUTC();
  }
  data.timestampInSeconds = GetMinuteStartTimestampUTC(data.timestampInSeconds);
  resp.status = data.status;
  resp.latency = data.latency;
  resp.type = "webhook";
  let timestamp = GetMinuteStartNowTimestampUTC();
  try {
    if (data.timestampInSeconds > timestamp) {
      throw new Error("timestampInSeconds is in future");
    }
    if (timestamp - data.timestampInSeconds > 90 * 24 * 60 * 60) {
      throw new Error("timestampInSeconds is older than 90days");
    }
  } catch (err) {
    return { error: err.message, status: 400 };
  }
  if (!CheckIfValidTag(tag)) {
    return { error: "invalid tag", status: 400 };
  }
  let monitors = JSON.parse(fs.readFileSync(public_env.PUBLIC_KENER_FOLDER + "/monitors.json", "utf8"));
  const monitor = monitors.find((monitor2) => monitor2.tag === tag);
  let day0 = {};
  day0[data.timestampInSeconds] = resp;
  fs.writeFileSync(public_env.PUBLIC_KENER_FOLDER + `/${monitor.folderName}.webhook.${Randomstring.generate()}.json`, JSON.stringify(day0, null, 2));
  return { status: 200, message: "success at " + data.timestampInSeconds };
};
const GHIssueToKenerIncident = function(issue) {
  let issueLabels = issue.labels.map((label) => {
    return label.name;
  });
  let tagsAvailable = GetAllTags();
  let commonTags = tagsAvailable.filter((tag) => issueLabels.includes(tag));
  let resp = {
    createdAt: Math.floor(new Date(issue.created_at).getTime() / 1e3),
    //in seconds
    closedAt: issue.closed_at ? Math.floor(new Date(issue.closed_at).getTime() / 1e3) : null,
    title: issue.title,
    tags: commonTags,
    incidentNumber: issue.number
  };
  resp.startDatetime = GetStartTimeFromBody(issue.body);
  resp.endDatetime = GetEndTimeFromBody(issue.body);
  let body = issue.body;
  body = body.replace(/\[start_datetime:(\d+)\]/g, "");
  body = body.replace(/\[end_datetime:(\d+)\]/g, "");
  resp.body = body.trim();
  resp.impact = null;
  if (issueLabels.includes("incident-down")) {
    resp.impact = "DOWN";
  } else if (issueLabels.includes("incident-degraded")) {
    resp.impact = "DEGRADED";
  }
  resp.isMaintenance = false;
  if (issueLabels.includes("maintenance")) {
    resp.isMaintenance = true;
  }
  resp.isIdentified = false;
  resp.isResolved = false;
  if (issueLabels.includes("identified")) {
    resp.isIdentified = true;
  }
  if (issueLabels.includes("resolved")) {
    resp.isResolved = true;
  }
  return resp;
};
const ParseIncidentPayload = function(payload) {
  let startDatetime = payload.startDatetime;
  let endDatetime = payload.endDatetime;
  let title = payload.title;
  let body = payload.body || "";
  let tags = payload.tags;
  let impact = payload.impact;
  let isMaintenance = payload.isMaintenance;
  let isIdentified = payload.isIdentified;
  let isResolved = payload.isResolved;
  if (startDatetime && typeof startDatetime !== "number") {
    return { error: "Invalid startDatetime" };
  }
  if (endDatetime && (typeof endDatetime !== "number" || endDatetime <= startDatetime)) {
    return { error: "Invalid endDatetime" };
  }
  if (!title || typeof title !== "string") {
    return { error: "Invalid title" };
  }
  if (!tags || !Array.isArray(tags) || tags.length === 0 || tags.some((tag) => typeof tag !== "string")) {
    return { error: "Invalid tags" };
  }
  if (body && typeof body !== "string") {
    return { error: "Invalid body" };
  }
  if (impact && (typeof impact !== "string" || ["DOWN", "DEGRADED"].indexOf(impact) === -1)) {
    return { error: "Invalid impact" };
  }
  const allTags = GetAllTags();
  if (tags.some((tag) => allTags.indexOf(tag) === -1)) {
    return { error: "Unknown tags" };
  }
  if (isMaintenance && typeof isMaintenance !== "boolean") {
    return { error: "Invalid isMaintenance" };
  }
  let githubLabels = ["incident"];
  tags.forEach((tag) => {
    githubLabels.push(tag);
  });
  if (impact) {
    githubLabels.push("incident-" + impact.toLowerCase());
  }
  if (isMaintenance) {
    githubLabels.push("maintenance");
  }
  if (isResolved !== void 0 && isResolved === true) {
    githubLabels.push("resolved");
  }
  if (isIdentified !== void 0 && isIdentified === true) {
    githubLabels.push("identified");
  }
  if (startDatetime)
    body = body + ` [start_datetime:${startDatetime}]`;
  if (endDatetime)
    body = body + ` [end_datetime:${endDatetime}]`;
  return { title, body, githubLabels };
};
const GetMonitorStatusByTag = function(tag) {
  if (!CheckIfValidTag(tag)) {
    return { error: "invalid tag", status: 400 };
  }
  const resp = {
    status: null,
    uptime: null,
    lastUpdatedAt: null
  };
  let monitors = JSON.parse(fs.readFileSync(public_env.PUBLIC_KENER_FOLDER + "/monitors.json", "utf8"));
  const { path0Day } = monitors.find((monitor) => monitor.tag === tag);
  const dayData = JSON.parse(fs.readFileSync(path0Day, "utf8"));
  const lastUpdatedAt = Object.keys(dayData)[Object.keys(dayData).length - 1];
  const lastObj = dayData[lastUpdatedAt];
  resp.status = lastObj.status;
  let ups = 0;
  let downs = 0;
  let degradeds = 0;
  for (const timestamp in dayData) {
    const obj = dayData[timestamp];
    if (obj.status == "UP") {
      ups++;
    } else if (obj.status == "DEGRADED") {
      degradeds++;
    } else if (obj.status == "DOWN") {
      downs++;
    }
  }
  resp.uptime = ParseUptime(ups + degradeds, ups + degradeds + downs);
  resp.lastUpdatedAt = Number(lastUpdatedAt);
  return { status: 200, ...resp };
};

export { GHIssueToKenerIncident as G, ParseIncidentPayload as P, auth as a, GetMonitorStatusByTag as b, store as s };
//# sourceMappingURL=webhook-926b85d0.js.map

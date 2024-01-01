import fs from 'fs-extra';
import { p as public_env } from './shared-server-58a5f352.js';
import { a as GetNowTimestampUTC, b as GetMinuteStartTimestampUTC, G as GetMinuteStartNowTimestampUTC } from './tool-153dc604.js';
import { d as GetStartTimeFromBody, e as GetEndTimeFromBody } from './github-54c09baa.js';
import Randomstring from 'randomstring';

const API_TOKEN = process.env.API_TOKEN;
const API_IP = process.env.API_IP;
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
    ip = request.headers.get("x-forwarded-for") || request.socket.remoteAddress || request.headers.get("x-real-ip");
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
  let monitors = JSON.parse(fs.readFileSync(public_env.PUBLIC_KENER_FOLDER + "/monitors.json", "utf8"));
  let tagsAvailable = monitors.map((monitor) => {
    return monitor.tag;
  });
  let commonTags = tagsAvailable.filter((tag) => issueLabels.includes(tag));
  let resp = {
    createdAt: Math.floor(new Date(issue.created_at).getTime() / 1e3),
    //in seconds
    closedAt: issue.closed_at ? Math.floor(new Date(issue.closed_at).getTime() / 1e3) : null,
    title: issue.title,
    tag: commonTags[0],
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
  let tag = payload.tag;
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
  if (!tag || typeof tag !== "string") {
    return { error: "Invalid tag" };
  }
  if (body && typeof body !== "string") {
    return { error: "Invalid body" };
  }
  if (impact && (typeof impact !== "string" || ["DOWN", "DEGRADED"].indexOf(impact) === -1)) {
    return { error: "Invalid impact" };
  }
  if (!CheckIfValidTag(tag)) {
    return { error: "Invalid tag" };
  }
  let githubLabels = ["incident"];
  githubLabels.push(tag);
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

export { GHIssueToKenerIncident as G, ParseIncidentPayload as P, auth as a, store as s };
//# sourceMappingURL=webhook-bd364d16.js.map

import { j as json } from './index-2b68e648.js';
import { a as auth, G as GHIssueToKenerIncident } from './webhook-926b85d0.js';
import { b as GetIncidentByNumber, d as UpdateIssueLabels } from './github-31d08953.js';
import { p as public_env } from './shared-server-58a5f352.js';
import fs from 'fs-extra';
import './helpers-0acb6e43.js';
import './tool-b4b3e524.js';
import 'randomstring';
import 'axios';
import 'marked';

async function POST({ request, params }) {
  const payload = await request.json();
  const incidentNumber = params.incidentNumber;
  const authError = auth(request);
  if (authError !== null) {
    return json(
      { error: authError.message },
      {
        status: 401
      }
    );
  }
  let isIdentified = payload.isIdentified;
  let isResolved = payload.isResolved;
  let endDatetime = payload.endDatetime;
  if (!incidentNumber || isNaN(incidentNumber)) {
    return json(
      { error: "Invalid incidentNumber" },
      {
        status: 400
      }
    );
  }
  if (endDatetime && typeof endDatetime !== "number") {
    return json(
      { error: "Invalid endDatetime" },
      {
        status: 400
      }
    );
  }
  let site = JSON.parse(fs.readFileSync(public_env.PUBLIC_KENER_FOLDER + "/site.json", "utf8"));
  let github = site.github;
  let issue = await GetIncidentByNumber(github, incidentNumber);
  if (issue === null) {
    return json(
      { error: "github error" },
      {
        status: 400
      }
    );
  }
  let labels = issue.labels.map((label) => {
    return label.name;
  });
  if (isIdentified !== void 0) {
    labels = labels.filter((label) => label !== "identified");
    if (isIdentified === true) {
      labels.push("identified");
    }
  }
  if (isResolved !== void 0) {
    labels = labels.filter((label) => label !== "resolved");
    if (isResolved === true) {
      labels.push("resolved");
    }
  }
  let body = issue.body;
  if (endDatetime) {
    body = body.replace(/\[end_datetime:(\d+)\]/g, "");
    body = body.trim();
    body = body + ` [end_datetime:${endDatetime}]`;
  }
  let resp = await UpdateIssueLabels(github, incidentNumber, labels, body);
  if (resp === null) {
    return json(
      { error: "github error" },
      {
        status: 400
      }
    );
  }
  return json(GHIssueToKenerIncident(resp), {
    status: 200
  });
}

export { POST };
//# sourceMappingURL=_server-8c01e71b.js.map

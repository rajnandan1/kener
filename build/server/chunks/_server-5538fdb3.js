import { j as json } from './index-d7f43214.js';
import { a as auth, P as ParseIncidentPayload, G as GHIssueToKenerIncident } from './webhook-a142f52d.js';
import { C as CreateIssue, S as SearchIssue } from './github-da26bf52.js';
import { p as public_env } from './shared-server-58a5f352.js';
import fs from 'fs-extra';
import './helpers-0acb6e43.js';
import './tool-53f63ca6.js';
import 'randomstring';
import 'axios';
import 'marked';

async function POST({ request }) {
  const payload = await request.json();
  const authError = auth(request);
  if (authError !== null) {
    return json(
      { error: authError.message },
      {
        status: 401
      }
    );
  }
  let { title, body, githubLabels, error } = ParseIncidentPayload(payload);
  if (error) {
    return json(
      { error },
      {
        status: 400
      }
    );
  }
  let site = JSON.parse(fs.readFileSync(public_env.PUBLIC_KENER_FOLDER + "/site.json", "utf8"));
  let github = site.github;
  let resp = await CreateIssue(github, title, body, githubLabels);
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
async function GET({ request, url }) {
  const authError = auth(request);
  if (authError !== null) {
    return json(
      { error: authError.message },
      {
        status: 401
      }
    );
  }
  const query = url.searchParams;
  const state = query.get("state") || "open";
  const tags = query.get("tags") || "";
  const page = query.get("page") || 1;
  const per_page = query.get("per_page") || 10;
  const createdAfter = query.get("created_after_utc") || "";
  const createdBefore = query.get("created_before_utc") || "";
  const titleLike = query.get("title_like") || "";
  if (state !== "open" && state !== "closed") {
    return json(
      { error: "state must be open or closed" },
      {
        status: 400
      }
    );
  }
  let site = JSON.parse(
    fs.readFileSync(public_env.PUBLIC_KENER_FOLDER + "/site.json", "utf8")
  );
  let github = site.github;
  const repo = `${github.owner}/${github.repo}`;
  const is = "issue";
  const filterArray = [
    `repo:${repo}`,
    `is:${is}`,
    `state:${state}`,
    `label:incident`,
    `sort:created-desc`,
    `label:${tags.split(",").map((tag) => tag.trim()).join(",")}`
  ];
  if (createdBefore && createdAfter) {
    let dateFilter = "";
    let iso = new Date(createdAfter * 1e3).toISOString();
    dateFilter += `created:${iso}`;
    iso = new Date(createdBefore * 1e3).toISOString();
    dateFilter += `..${iso}`;
    filterArray.push(dateFilter);
  } else if (createdAfter) {
    let iso = new Date(createdAfter * 1e3).toISOString();
    filterArray.push(`created:>=${iso}`);
  } else if (createdBefore) {
    let iso = new Date(createdBefore * 1e3).toISOString();
    filterArray.push(`created:<=${iso}`);
  }
  if (titleLike) {
    filterArray.unshift(`${titleLike} in:title`);
  }
  const resp = await SearchIssue(filterArray, page, per_page);
  const incidents = resp.items.map((issue) => GHIssueToKenerIncident(issue));
  return json(
    incidents,
    {
      status: 200
    }
  );
}

export { GET, POST };
//# sourceMappingURL=_server-5538fdb3.js.map

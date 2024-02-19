import { j as json } from './index-2b68e648.js';
import { a as auth } from './webhook-926b85d0.js';
import { c as GetCommentsForIssue, A as AddComment } from './github-31d08953.js';
import { p as public_env } from './shared-server-58a5f352.js';
import fs from 'fs-extra';
import './helpers-0acb6e43.js';
import './tool-b4b3e524.js';
import 'randomstring';
import 'axios';
import 'marked';

async function GET({ request, params }) {
  const authError = auth(request);
  if (authError !== null) {
    return json(
      { error: authError.message },
      {
        status: 401
      }
    );
  }
  const incidentNumber = params.incidentNumber;
  if (!incidentNumber || isNaN(incidentNumber)) {
    return json(
      { error: "Invalid incidentNumber" },
      {
        status: 400
      }
    );
  }
  let site = JSON.parse(fs.readFileSync(public_env.PUBLIC_KENER_FOLDER + "/site.json", "utf8"));
  let github = site.github;
  let resp = await GetCommentsForIssue(incidentNumber, github);
  return json(
    resp.map((comment) => {
      return {
        commentID: comment.id,
        body: comment.body,
        createdAt: Math.floor(new Date(comment.created_at).getTime() / 1e3)
      };
    }),
    {
      status: 200
    }
  );
}
async function POST({ request, params }) {
  const authError = auth(request);
  if (authError !== null) {
    return json(
      { error: authError.message },
      {
        status: 401
      }
    );
  }
  const incidentNumber = params.incidentNumber;
  if (!incidentNumber || isNaN(incidentNumber)) {
    return json(
      { error: "Invalid incidentNumber" },
      {
        status: 400
      }
    );
  }
  const payload = await request.json();
  let body = payload.body;
  if (!body || typeof body !== "string") {
    return json(
      { error: "Invalid body" },
      {
        status: 400
      }
    );
  }
  let site = JSON.parse(fs.readFileSync(public_env.PUBLIC_KENER_FOLDER + "/site.json", "utf8"));
  let github = site.github;
  let resp = await AddComment(github, incidentNumber, body);
  if (resp === null) {
    return json(
      { error: "github error" },
      {
        status: 400
      }
    );
  }
  return json(
    {
      commentID: resp.id,
      body: resp.body,
      createdAt: Math.floor(new Date(resp.created_at).getTime() / 1e3)
    },
    {
      status: 200
    }
  );
}

export { GET, POST };
//# sourceMappingURL=_server-7b4a554d.js.map

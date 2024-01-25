import { j as json } from './index-2b68e648.js';
import { a as auth, P as ParseIncidentPayload, G as GHIssueToKenerIncident } from './webhook-57da3550.js';
import { C as CreateIssue } from './github-ed3bad6d.js';
import { p as public_env } from './shared-server-58a5f352.js';
import fs from 'fs-extra';
import './tool-153dc604.js';
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

export { POST };
//# sourceMappingURL=_server-c9ba285d.js.map

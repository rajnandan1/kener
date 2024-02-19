import { j as json } from './index-2b68e648.js';
import { p as public_env } from './shared-server-58a5f352.js';
import fs from 'fs-extra';
import { c as GetCommentsForIssue } from './github-31d08953.js';
import { marked } from 'marked';
import 'axios';
import './tool-b4b3e524.js';

async function GET({ params }) {
  const incidentNumber = params.id;
  let siteData = JSON.parse(fs.readFileSync(public_env.PUBLIC_KENER_FOLDER + "/site.json", "utf8"));
  let comments = await GetCommentsForIssue(incidentNumber, siteData.github);
  comments = comments.map((comment) => {
    const html = marked.parse(comment.body);
    return {
      body: html,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      html_url: comment.html_url
    };
  });
  return json(comments);
}

export { GET };
//# sourceMappingURL=_server-cdb4368c.js.map

import { p as public_env } from './shared-server-58a5f352.js';
import { a as activeIncident, p as pastIncident, g as getCommentsForIssue } from './incident-f316d011.js';
import Markdoc from '@markdoc/markdoc';
import fs from 'fs-extra';
import 'axios';

var _page = /*#__PURE__*/Object.freeze({
  __proto__: null
});

async function mapper(issue) {
  const ast = Markdoc.parse(issue.body);
  const content = Markdoc.transform(ast);
  const html = Markdoc.renderers.html(content);
  const comments = await getCommentsForIssue(issue.number, this.github);
  return {
    title: issue.title,
    number: issue.number,
    body: html,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    collapsed: true,
    comments: issue.comments,
    html_url: issue.html_url,
    // @ts-ignore
    comments: comments.map((comment) => {
      const ast2 = Markdoc.parse(comment.body);
      const content2 = Markdoc.transform(ast2);
      const html2 = Markdoc.renderers.html(content2);
      return {
        body: html2,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        html_url: comment.html_url
      };
    })
  };
}
async function load({ params, route, url, parent }) {
  let monitors = JSON.parse(fs.readFileSync(public_env.PUBLIC_KENER_FOLDER + "/monitors.json", "utf8"));
  const siteData = await parent();
  const github = siteData.site.github;
  const { description, name, tag } = monitors.find((monitor) => monitor.folderName === params.id);
  const gitHubActiveIssues = await activeIncident(tag, github);
  const gitHubPastIssues = await pastIncident(tag, github);
  return {
    issues: params.id,
    githubConfig: github,
    monitor: { description, name },
    activeIncidents: await Promise.all(gitHubActiveIssues.map(mapper, { github })),
    pastIncidents: await Promise.all(gitHubPastIssues.map(mapper, { github }))
  };
}

var _page_server = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 4;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-21cc1492.js')).default;
const universal_id = "src/routes/incident/[id]/+page.js";
const server_id = "src/routes/incident/[id]/+page.server.js";
const imports = ["_app/immutable/nodes/4.9ff9e569.js","_app/immutable/chunks/scheduler.b29f3093.js","_app/immutable/chunks/index.7aebdd36.js","_app/immutable/chunks/separator.4ff811e2.js","_app/immutable/chunks/index.ed2d54e5.js","_app/immutable/chunks/index.2f161581.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server as server, server_id, stylesheets, _page as universal, universal_id };
//# sourceMappingURL=4-58c19338.js.map

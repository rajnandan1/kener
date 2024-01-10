import { p as public_env } from './shared-server-58a5f352.js';
import { G as GetIncidents, M as Mapper } from './github-54c09baa.js';
import fs from 'fs-extra';
import 'axios';
import './tool-153dc604.js';
import 'marked';

async function load({ params, route, url, parent }) {
  let monitors = JSON.parse(fs.readFileSync(public_env.PUBLIC_KENER_FOLDER + "/monitors.json", "utf8"));
  const siteData = await parent();
  const github = siteData.site.github;
  const { description, name, tag, image } = monitors.find((monitor) => monitor.folderName === params.id);
  const allIncidents = await GetIncidents(tag, github, "all");
  const gitHubActiveIssues = allIncidents.filter((issue) => {
    return issue.state === "open";
  });
  const gitHubPastIssues = allIncidents.filter((issue) => {
    return issue.state === "closed";
  });
  return {
    issues: params.id,
    githubConfig: github,
    monitor: { description, name, image },
    activeIncidents: await Promise.all(gitHubActiveIssues.map(Mapper, { github })),
    pastIncidents: await Promise.all(gitHubPastIssues.map(Mapper, { github }))
  };
}

var _page_server = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 4;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-48e57f95.js')).default;
const server_id = "src/routes/incident/[id]/+page.server.js";
const imports = ["_app/immutable/nodes/4.9a5d33f6.js","_app/immutable/chunks/scheduler.0e55af49.js","_app/immutable/chunks/index.7fa4eb0f.js","_app/immutable/chunks/ctx.b7ea881a.js","_app/immutable/chunks/index.3cd3e9b4.js","_app/immutable/chunks/incident.99422fec.js","_app/immutable/chunks/chevron-down.2b71fd98.js","_app/immutable/chunks/index.8cfb104d.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server as server, server_id, stylesheets };
//# sourceMappingURL=4-5261b32b.js.map

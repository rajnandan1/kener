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

const index = 6;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-6a500acb.js')).default;
const server_id = "src/routes/incident/[id]/+page.server.js";
const imports = ["_app/immutable/nodes/6.2ba41b0c.js","_app/immutable/chunks/scheduler.3b52f240.js","_app/immutable/chunks/index.e0f9dde7.js","_app/immutable/chunks/Icon.55f18d08.js","_app/immutable/chunks/index.df550c81.js","_app/immutable/chunks/incident.4012875f.js","_app/immutable/chunks/card-content.2099a051.js","_app/immutable/chunks/moment.0e609d86.js","_app/immutable/chunks/index.b64cf02a.js","_app/immutable/chunks/chevron-down.2e6263fc.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server as server, server_id, stylesheets };
//# sourceMappingURL=6-0c17f47d.js.map

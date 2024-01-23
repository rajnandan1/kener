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
const component = async () => component_cache ??= (await import('./_page.svelte-5875bd15.js')).default;
const server_id = "src/routes/incident/[id]/+page.server.js";
const imports = ["_app/immutable/nodes/6.01b660a8.js","_app/immutable/chunks/scheduler.71bb06cf.js","_app/immutable/chunks/index.0750685b.js","_app/immutable/chunks/ctx.42013687.js","_app/immutable/chunks/index.8fc884bc.js","_app/immutable/chunks/incident.21bfd806.js","_app/immutable/chunks/Icon.9b837364.js","_app/immutable/chunks/moment.60ffb904.js","_app/immutable/chunks/index.63425bb3.js","_app/immutable/chunks/chevron-down.f5d536ec.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server as server, server_id, stylesheets };
//# sourceMappingURL=6-012cfb25.js.map

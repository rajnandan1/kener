import { p as public_env } from './shared-server-58a5f352.js';
import { a as GetIncidents, M as Mapper } from './github-9db56498.js';
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
const component = async () => component_cache ??= (await import('./_page.svelte-295ff8ad.js')).default;
const server_id = "src/routes/incident/[id]/+page.server.js";
const imports = ["_app/immutable/nodes/6.4f984dcc.js","_app/immutable/chunks/scheduler.8852886c.js","_app/immutable/chunks/index.fb8f3617.js","_app/immutable/chunks/ctx.1e61a5a6.js","_app/immutable/chunks/index.97524e95.js","_app/immutable/chunks/incident.17ec64cc.js","_app/immutable/chunks/Icon.7b7db889.js","_app/immutable/chunks/incident.svelte_svelte_type_style_lang.dc139efe.js","_app/immutable/chunks/index.cd89ef46.js","_app/immutable/chunks/chevron-down.f8b4fb7d.js"];
const stylesheets = ["_app/immutable/assets/incident.d0acbf00.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server as server, server_id, stylesheets };
//# sourceMappingURL=6-c68642e1.js.map

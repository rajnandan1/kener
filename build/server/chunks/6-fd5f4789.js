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
const component = async () => component_cache ??= (await import('./_page.svelte-8da365d0.js')).default;
const server_id = "src/routes/incident/[id]/+page.server.js";
const imports = ["_app/immutable/nodes/6.43d60634.js","_app/immutable/chunks/scheduler.c2c0974e.js","_app/immutable/chunks/index.5b988c7b.js","_app/immutable/chunks/ctx.4220f49e.js","_app/immutable/chunks/index.b6690f7e.js","_app/immutable/chunks/incident.9617350e.js","_app/immutable/chunks/Icon.51fe0f7f.js","_app/immutable/chunks/card-title.e828894a.js","_app/immutable/chunks/index.4e2c25ba.js","_app/immutable/chunks/axios.57194239.js","_app/immutable/chunks/chevron-down.bdc4d823.js"];
const stylesheets = ["_app/immutable/assets/incident.d0acbf00.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server as server, server_id, stylesheets };
//# sourceMappingURL=6-fd5f4789.js.map

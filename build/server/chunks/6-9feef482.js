import { p as public_env } from './shared-server-58a5f352.js';
import { a as GetIncidents, M as Mapper } from './github-da26bf52.js';
import fs from 'fs-extra';
import 'axios';
import './tool-53f63ca6.js';
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
const component = async () => component_cache ??= (await import('./_page.svelte-5e89030c.js')).default;
const server_id = "src/routes/incident/[id]/+page.server.js";
const imports = ["_app/immutable/nodes/6.5e131a8e.js","_app/immutable/chunks/scheduler.36bfad59.js","_app/immutable/chunks/index.76a7851a.js","_app/immutable/chunks/Icon.22c2c156.js","_app/immutable/chunks/index.a41bf830.js","_app/immutable/chunks/incident.0ec87052.js","_app/immutable/chunks/card-content.b04fef6d.js","_app/immutable/chunks/index.f836667e.js","_app/immutable/chunks/client.22cd9d5b.js","_app/immutable/chunks/chevron-down.f5cb0116.js"];
const stylesheets = ["_app/immutable/assets/incident.d0acbf00.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server as server, server_id, stylesheets };
//# sourceMappingURL=6-9feef482.js.map

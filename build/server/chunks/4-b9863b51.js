import { p as public_env } from './shared-server-58a5f352.js';
import { G as GetIncidents, M as Mapper } from './github-e1662b86.js';
import fs from 'fs-extra';
import 'axios';
import './tool-153dc604.js';
import '@markdoc/markdoc';

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
const component = async () => component_cache ??= (await import('./_page.svelte-1b349938.js')).default;
const server_id = "src/routes/incident/[id]/+page.server.js";
const imports = ["_app/immutable/nodes/4.7baf152c.js","_app/immutable/chunks/scheduler.83e0fec9.js","_app/immutable/chunks/index.24520d8d.js","_app/immutable/chunks/each.e59479a4.js","_app/immutable/chunks/incident.107e5bd4.js","_app/immutable/chunks/card-content.ea8e0826.js","_app/immutable/chunks/index.4e801429.js","_app/immutable/chunks/index.3be6ad7f.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server as server, server_id, stylesheets };
//# sourceMappingURL=4-b9863b51.js.map

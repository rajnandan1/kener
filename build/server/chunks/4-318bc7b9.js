import { p as public_env } from './shared-server-58a5f352.js';
import { a as activeIncident, p as pastIncident, m as mapper } from './incident2-deedf712.js';
import fs from 'fs-extra';
import 'axios';
import 'moment';
import '@markdoc/markdoc';

async function load({ params, route, url, parent }) {
  let monitors = JSON.parse(fs.readFileSync(public_env.PUBLIC_KENER_FOLDER + "/monitors.json", "utf8"));
  const siteData = await parent();
  const github = siteData.site.github;
  const { description, name, tag, image } = monitors.find((monitor) => monitor.folderName === params.id);
  const gitHubActiveIssues = await activeIncident(tag, github);
  const gitHubPastIssues = await pastIncident(tag, github);
  return {
    issues: params.id,
    githubConfig: github,
    monitor: { description, name, image },
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
const component = async () => component_cache ??= (await import('./_page.svelte-da43f86d.js')).default;
const server_id = "src/routes/incident/[id]/+page.server.js";
const imports = ["_app/immutable/nodes/4.5411c355.js","_app/immutable/chunks/scheduler.ea4d12df.js","_app/immutable/chunks/index.12c4b772.js","_app/immutable/chunks/incident.1bd69fe5.js","_app/immutable/chunks/index.06f948c6.js","_app/immutable/chunks/index.7ea6c3d8.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server as server, server_id, stylesheets };
//# sourceMappingURL=4-318bc7b9.js.map

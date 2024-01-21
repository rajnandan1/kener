import { G as GetIncidents, M as Mapper } from './github-54c09baa.js';
import { F as FetchData } from './page-a0c691b6.js';
import { p as public_env } from './shared-server-58a5f352.js';
import fs from 'fs-extra';
import 'axios';
import './tool-153dc604.js';
import 'marked';
import './helpers-1d8653cf.js';

async function load({ params, route, url, parent }) {
  let monitors = JSON.parse(fs.readFileSync(public_env.PUBLIC_KENER_FOLDER + "/monitors.json", "utf8"));
  const parentData = await parent();
  const siteData = parentData.site;
  const github = siteData.github;
  const monitorsActive = [];
  for (let i = 0; i < monitors.length; i++) {
    if (monitors[i].hidden !== void 0 && monitors[i].hidden === true) {
      continue;
    }
    if (monitors[i].category === void 0 || monitors[i].category !== params.category) {
      continue;
    }
    const gitHubActiveIssues = await GetIncidents(monitors[i].tag, github, "open");
    delete monitors[i].api;
    delete monitors[i].defaultStatus;
    let data = await FetchData(monitors[i], parentData.localTz);
    monitors[i].pageData = data;
    monitors[i].activeIncidents = await Promise.all(gitHubActiveIssues.map(Mapper, { github }));
    monitorsActive.push(monitors[i]);
  }
  return {
    monitors: monitorsActive
  };
}

var _page_server = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 3;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-4b22fd47.js')).default;
const server_id = "src/routes/category-[category]/+page.server.js";
const imports = ["_app/immutable/nodes/3.dcb3a8cd.js","_app/immutable/chunks/scheduler.3b52f240.js","_app/immutable/chunks/index.e0f9dde7.js","_app/immutable/chunks/Icon.55f18d08.js","_app/immutable/chunks/index.df550c81.js","_app/immutable/chunks/monitor.e757fb2a.js","_app/immutable/chunks/moment.0e609d86.js","_app/immutable/chunks/index.b64cf02a.js","_app/immutable/chunks/card-content.2099a051.js","_app/immutable/chunks/incident.4012875f.js","_app/immutable/chunks/chevron-down.2e6263fc.js","_app/immutable/chunks/stores.85fa8f06.js","_app/immutable/chunks/singletons.4e6d7679.js","_app/immutable/chunks/paths.2362653e.js"];
const stylesheets = ["_app/immutable/assets/monitor.f0f362d5.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server as server, server_id, stylesheets };
//# sourceMappingURL=3-4d2961d4.js.map

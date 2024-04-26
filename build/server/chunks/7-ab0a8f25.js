import { G as GetOpenIncidents, M as Mapper, F as FilterAndInsertMonitorInIncident } from './github-da26bf52.js';
import { F as FetchData } from './page-576e2fb0.js';
import { p as public_env } from './shared-server-58a5f352.js';
import fs from 'fs-extra';
import 'axios';
import './tool-53f63ca6.js';
import 'marked';

async function load({ params, route, url, parent }) {
  let monitors = JSON.parse(fs.readFileSync(public_env.PUBLIC_KENER_FOLDER + "/monitors.json", "utf8"));
  const parentData = await parent();
  const siteData = parentData.site;
  const github = siteData.github;
  const monitorsActive = [];
  for (let i = 0; i < monitors.length; i++) {
    if (monitors[i].tag !== params.tag) {
      continue;
    }
    delete monitors[i].api;
    delete monitors[i].defaultStatus;
    let data = await FetchData(monitors[i], parentData.localTz);
    monitors[i].pageData = data;
    monitorsActive.push(monitors[i]);
  }
  let openIncidents = await GetOpenIncidents(github);
  let openIncidentsReduced = openIncidents.map(Mapper);
  return {
    monitors: monitorsActive,
    openIncidents: FilterAndInsertMonitorInIncident(openIncidentsReduced, monitorsActive)
  };
}

var _page_server = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 7;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-ce6dfce4.js')).default;
const server_id = "src/routes/monitor-[tag]/+page.server.js";
const imports = ["_app/immutable/nodes/7.fb0699c9.js","_app/immutable/chunks/scheduler.36bfad59.js","_app/immutable/chunks/index.76a7851a.js","_app/immutable/chunks/Icon.22c2c156.js","_app/immutable/chunks/index.a41bf830.js","_app/immutable/chunks/monitor.628a0861.js","_app/immutable/chunks/client.22cd9d5b.js","_app/immutable/chunks/index.f836667e.js","_app/immutable/chunks/events.74eec825.js","_app/immutable/chunks/card-content.b04fef6d.js","_app/immutable/chunks/incident.0ec87052.js","_app/immutable/chunks/chevron-down.f5cb0116.js","_app/immutable/chunks/paths.2cb8f640.js"];
const stylesheets = ["_app/immutable/assets/monitor.27a2e44b.css","_app/immutable/assets/incident.d0acbf00.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server as server, server_id, stylesheets };
//# sourceMappingURL=7-ab0a8f25.js.map

import { G as GetOpenIncidents, M as Mapper, F as FilterAndInsertMonitorInIncident } from './github-9db56498.js';
import { F as FetchData } from './page-6abffa91.js';
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

const index = 3;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-bedcd687.js')).default;
const server_id = "src/routes/category-[category]/+page.server.js";
const imports = ["_app/immutable/nodes/3.b70d8918.js","_app/immutable/chunks/scheduler.c2c0974e.js","_app/immutable/chunks/index.5b988c7b.js","_app/immutable/chunks/ctx.4220f49e.js","_app/immutable/chunks/index.b6690f7e.js","_app/immutable/chunks/monitor.7bc511f1.js","_app/immutable/chunks/axios.57194239.js","_app/immutable/chunks/Icon.51fe0f7f.js","_app/immutable/chunks/index.4e2c25ba.js","_app/immutable/chunks/events.09388442.js","_app/immutable/chunks/incident.9617350e.js","_app/immutable/chunks/card-title.e828894a.js","_app/immutable/chunks/chevron-down.bdc4d823.js","_app/immutable/chunks/stores.7c373cb9.js","_app/immutable/chunks/singletons.0d2dde0a.js","_app/immutable/chunks/paths.06967008.js"];
const stylesheets = ["_app/immutable/assets/monitor.824f5800.css","_app/immutable/assets/incident.d0acbf00.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server as server, server_id, stylesheets };
//# sourceMappingURL=3-6d2a8fac.js.map

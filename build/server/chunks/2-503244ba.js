import { h as hasActiveIncident } from './incident-f316d011.js';
import { p as public_env } from './shared-server-58a5f352.js';
import fs from 'fs-extra';
import 'axios';

async function load({ params, route, url, parent }) {
  let monitors = JSON.parse(fs.readFileSync(public_env.PUBLIC_KENER_FOLDER + "/monitors.json", "utf8"));
  const parentData = await parent();
  const siteData = parentData.site;
  const github = siteData.github;
  for (let i = 0; i < monitors.length; i++) {
    monitors[i].hasActiveIncident = await hasActiveIncident(monitors[i].tag, github);
  }
  return {
    monitors
  };
}

var _page_server = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 2;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-2442d3a2.js')).default;
const server_id = "src/routes/+page.server.js";
const imports = ["_app/immutable/nodes/2.34ad5b96.js","_app/immutable/chunks/scheduler.b29f3093.js","_app/immutable/chunks/index.7aebdd36.js","_app/immutable/chunks/index.eede6470.js","_app/immutable/chunks/index.ed2d54e5.js","_app/immutable/chunks/index.2f161581.js","_app/immutable/chunks/separator.4ff811e2.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server as server, server_id, stylesheets };
//# sourceMappingURL=2-503244ba.js.map

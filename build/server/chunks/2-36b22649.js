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
const component = async () => component_cache ??= (await import('./_page.svelte-9f5ae3e9.js')).default;
const server_id = "src/routes/+page.server.js";
const imports = ["_app/immutable/nodes/2.2f9445f2.js","_app/immutable/chunks/scheduler.b29f3093.js","_app/immutable/chunks/index.32e7cd16.js","_app/immutable/chunks/index.778884e3.js","_app/immutable/chunks/index.cbc3d691.js","_app/immutable/chunks/index.2f161581.js","_app/immutable/chunks/separator.8f845d26.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server as server, server_id, stylesheets };
//# sourceMappingURL=2-36b22649.js.map

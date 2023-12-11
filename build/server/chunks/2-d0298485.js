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
const component = async () => component_cache ??= (await import('./_page.svelte-d99d8eb4.js')).default;
const server_id = "src/routes/+page.server.js";
const imports = ["_app/immutable/nodes/2.b2ee011c.js","_app/immutable/chunks/scheduler.4b6b5798.js","_app/immutable/chunks/index.7f0074cb.js","_app/immutable/chunks/index.3ba4103c.js","_app/immutable/chunks/index.df12faee.js","_app/immutable/chunks/index.addbbfd3.js","_app/immutable/chunks/separator.dedbaf4a.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server as server, server_id, stylesheets };
//# sourceMappingURL=2-d0298485.js.map

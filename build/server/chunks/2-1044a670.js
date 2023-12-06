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
const component = async () => component_cache ??= (await import('./_page.svelte-8c3b086a.js')).default;
const server_id = "src/routes/+page.server.js";
const imports = ["_app/immutable/nodes/2.c0a27d64.js","_app/immutable/chunks/scheduler.141ea698.js","_app/immutable/chunks/index.1b4fc896.js","_app/immutable/chunks/index.a07ecd25.js","_app/immutable/chunks/index.fb35a53a.js","_app/immutable/chunks/index.40cf8ae0.js","_app/immutable/chunks/moment.8d1eb7de.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server as server, server_id, stylesheets };
//# sourceMappingURL=2-1044a670.js.map

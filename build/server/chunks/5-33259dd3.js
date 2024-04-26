import { F as FetchData } from './page-576e2fb0.js';
import { p as public_env } from './shared-server-58a5f352.js';
import fs from 'fs-extra';

async function load({ params, route, url, parent }) {
  let monitors = JSON.parse(fs.readFileSync(public_env.PUBLIC_KENER_FOLDER + "/monitors.json", "utf8"));
  const parentData = await parent();
  const monitorsActive = [];
  const query = url.searchParams;
  const theme = query.get("theme");
  for (let i = 0; i < monitors.length; i++) {
    if (monitors[i].tag !== params.tag) {
      continue;
    }
    delete monitors[i].api;
    delete monitors[i].defaultStatus;
    monitors[i].embed = true;
    let data = await FetchData(monitors[i], parentData.localTz);
    monitors[i].pageData = data;
    monitorsActive.push(monitors[i]);
  }
  return {
    monitors: monitorsActive,
    theme,
    openIncidents: []
  };
}

var _page_server = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 5;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-3a830046.js')).default;
const server_id = "src/routes/embed-[tag]/+page.server.js";
const imports = ["_app/immutable/nodes/5.580836f6.js","_app/immutable/chunks/scheduler.36bfad59.js","_app/immutable/chunks/index.76a7851a.js","_app/immutable/chunks/Icon.22c2c156.js","_app/immutable/chunks/index.a41bf830.js","_app/immutable/chunks/monitor.628a0861.js","_app/immutable/chunks/client.22cd9d5b.js","_app/immutable/chunks/index.f836667e.js","_app/immutable/chunks/events.74eec825.js","_app/immutable/chunks/card-content.b04fef6d.js","_app/immutable/chunks/stores.eda3841a.js","_app/immutable/chunks/singletons.db536df2.js","_app/immutable/chunks/paths.2cb8f640.js"];
const stylesheets = ["_app/immutable/assets/monitor.27a2e44b.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server as server, server_id, stylesheets };
//# sourceMappingURL=5-33259dd3.js.map

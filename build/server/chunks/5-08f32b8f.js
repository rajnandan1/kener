import './github-9db56498.js';
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
const component = async () => component_cache ??= (await import('./_page.svelte-84ed0918.js')).default;
const server_id = "src/routes/embed-[tag]/+page.server.js";
const imports = ["_app/immutable/nodes/5.5df38f54.js","_app/immutable/chunks/scheduler.c2c0974e.js","_app/immutable/chunks/index.5b988c7b.js","_app/immutable/chunks/ctx.4220f49e.js","_app/immutable/chunks/index.b6690f7e.js","_app/immutable/chunks/monitor.7bc511f1.js","_app/immutable/chunks/axios.57194239.js","_app/immutable/chunks/Icon.51fe0f7f.js","_app/immutable/chunks/index.4e2c25ba.js","_app/immutable/chunks/events.09388442.js","_app/immutable/chunks/stores.7c373cb9.js","_app/immutable/chunks/singletons.0d2dde0a.js","_app/immutable/chunks/paths.06967008.js"];
const stylesheets = ["_app/immutable/assets/monitor.824f5800.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server as server, server_id, stylesheets };
//# sourceMappingURL=5-08f32b8f.js.map

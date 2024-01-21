import './github-54c09baa.js';
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
    theme
  };
}

var _page_server = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 5;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-f16bf3b4.js')).default;
const server_id = "src/routes/embed-[tag]/+page.server.js";
const imports = ["_app/immutable/nodes/5.ec311e8a.js","_app/immutable/chunks/scheduler.71bb06cf.js","_app/immutable/chunks/index.0750685b.js","_app/immutable/chunks/ctx.42013687.js","_app/immutable/chunks/index.8fc884bc.js","_app/immutable/chunks/monitor.d068e0ea.js","_app/immutable/chunks/moment.60ffb904.js","_app/immutable/chunks/Icon.9b837364.js","_app/immutable/chunks/index.63425bb3.js","_app/immutable/chunks/stores.92539dec.js","_app/immutable/chunks/singletons.3e1a54be.js","_app/immutable/chunks/paths.d22fe534.js"];
const stylesheets = ["_app/immutable/assets/monitor.f0f362d5.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server as server, server_id, stylesheets };
//# sourceMappingURL=5-23608022.js.map

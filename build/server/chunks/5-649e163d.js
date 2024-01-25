import './github-ed3bad6d.js';
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
    theme
  };
}

var _page_server = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 5;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-34de93b4.js')).default;
const server_id = "src/routes/embed-[tag]/+page.server.js";
const imports = ["_app/immutable/nodes/5.146093a5.js","_app/immutable/chunks/scheduler.86230e0b.js","_app/immutable/chunks/index.ced845ca.js","_app/immutable/chunks/ctx.150f748f.js","_app/immutable/chunks/index.f62c5b43.js","_app/immutable/chunks/monitor.5827bf8c.js","_app/immutable/chunks/moment.3b7ec35d.js","_app/immutable/chunks/Icon.9554439d.js","_app/immutable/chunks/index.4f5d9f7d.js","_app/immutable/chunks/stores.63dd3b52.js","_app/immutable/chunks/singletons.76323651.js","_app/immutable/chunks/paths.9abbdec7.js"];
const stylesheets = ["_app/immutable/assets/monitor.48ad7ec5.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server as server, server_id, stylesheets };
//# sourceMappingURL=5-649e163d.js.map

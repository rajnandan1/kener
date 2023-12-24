import fs from 'fs-extra';
import { p as public_env } from './shared-server-58a5f352.js';

async function load({ params, route, url, cookies }) {
  let site = JSON.parse(fs.readFileSync(public_env.PUBLIC_KENER_FOLDER + "/site.json", "utf8"));
  let localTz = "GMT";
  const localTzCookie = cookies.get("localTz");
  if (!!localTzCookie) {
    localTz = localTzCookie;
  }
  return {
    site,
    localTz
  };
}

var _layout_server = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 0;
let component_cache;
const component = async () => component_cache ??= (await import('./_layout.svelte-5d2a766d.js')).default;
const server_id = "src/routes/+layout.server.js";
const imports = ["_app/immutable/nodes/0.b56716e7.js","_app/immutable/chunks/scheduler.ea4d12df.js","_app/immutable/chunks/index.12c4b772.js","_app/immutable/chunks/globals.7f7f1b26.js","_app/immutable/chunks/index.cab2b962.js","_app/immutable/chunks/utils.9739163d.js","_app/immutable/chunks/index.7ea6c3d8.js"];
const stylesheets = ["_app/immutable/assets/0.7e5bb547.css"];
const fonts = [];

export { component, fonts, imports, index, _layout_server as server, server_id, stylesheets };
//# sourceMappingURL=0-1faca77f.js.map

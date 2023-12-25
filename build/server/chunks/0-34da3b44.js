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
const component = async () => component_cache ??= (await import('./_layout.svelte-48a64526.js')).default;
const server_id = "src/routes/+layout.server.js";
const imports = ["_app/immutable/nodes/0.45c98190.js","_app/immutable/chunks/scheduler.1b18627c.js","_app/immutable/chunks/index.a0ccbbe4.js","_app/immutable/chunks/each.e59479a4.js","_app/immutable/chunks/index.2f5200cf.js","_app/immutable/chunks/index.3e0e01a3.js"];
const stylesheets = ["_app/immutable/assets/0.cc9e9bab.css"];
const fonts = [];

export { component, fonts, imports, index, _layout_server as server, server_id, stylesheets };
//# sourceMappingURL=0-34da3b44.js.map

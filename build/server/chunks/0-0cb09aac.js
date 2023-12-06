import fs from 'fs-extra';
import { p as public_env } from './shared-server-58a5f352.js';

async function load({ params, route, url }) {
  let site = JSON.parse(fs.readFileSync(public_env.PUBLIC_KENER_FOLDER + "/site.json", "utf8"));
  return {
    site
  };
}

var _layout_server = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 0;
let component_cache;
const component = async () => component_cache ??= (await import('./_layout.svelte-810158f6.js')).default;
const server_id = "src/routes/+layout.server.js";
const imports = ["_app/immutable/nodes/0.f51a0470.js","_app/immutable/chunks/scheduler.141ea698.js","_app/immutable/chunks/index.1b4fc896.js","_app/immutable/chunks/index.a07ecd25.js","_app/immutable/chunks/index.fb35a53a.js","_app/immutable/chunks/index.40cf8ae0.js"];
const stylesheets = ["_app/immutable/assets/0.e0e8e03e.css"];
const fonts = [];

export { component, fonts, imports, index, _layout_server as server, server_id, stylesheets };
//# sourceMappingURL=0-0cb09aac.js.map

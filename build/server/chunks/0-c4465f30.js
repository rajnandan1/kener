import fs from 'fs-extra';
import { p as public_env } from './shared-server-58a5f352.js';

var dt = /* @__PURE__ */ new Date();
let tz = dt.getTimezoneOffset();
console.log(tz);
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
const component = async () => component_cache ??= (await import('./_layout.svelte-af02aa22.js')).default;
const server_id = "src/routes/+layout.server.js";
const imports = ["_app/immutable/nodes/0.ee8fad67.js","_app/immutable/chunks/scheduler.b29f3093.js","_app/immutable/chunks/index.32e7cd16.js","_app/immutable/chunks/index.778884e3.js","_app/immutable/chunks/index.cbc3d691.js","_app/immutable/chunks/index.2f161581.js"];
const stylesheets = ["_app/immutable/assets/0.d2e53a0b.css"];
const fonts = [];

export { component, fonts, imports, index, _layout_server as server, server_id, stylesheets };
//# sourceMappingURL=0-c4465f30.js.map

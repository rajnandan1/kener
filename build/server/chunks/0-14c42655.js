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
const component = async () => component_cache ??= (await import('./_layout.svelte-925daf0b.js')).default;
const server_id = "src/routes/+layout.server.js";
const imports = ["_app/immutable/nodes/0.5369867e.js","_app/immutable/chunks/scheduler.4b6b5798.js","_app/immutable/chunks/index.7f0074cb.js","_app/immutable/chunks/index.3ba4103c.js","_app/immutable/chunks/index.df12faee.js","_app/immutable/chunks/index.addbbfd3.js"];
const stylesheets = ["_app/immutable/assets/0.d2e53a0b.css"];
const fonts = [];

export { component, fonts, imports, index, _layout_server as server, server_id, stylesheets };
//# sourceMappingURL=0-14c42655.js.map

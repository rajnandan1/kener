import fs from 'fs-extra';
import { p as public_env } from './shared-server-58a5f352.js';

async function load({ params, route, url, cookies }) {
  const tzOffsetCookie = cookies.get("tzOffset");
  var dt = /* @__PURE__ */ new Date();
  let tzOffset = dt.getTimezoneOffset();
  if (!!tzOffsetCookie) {
    tzOffset = Number(tzOffsetCookie);
  }
  let site = JSON.parse(fs.readFileSync(public_env.PUBLIC_KENER_FOLDER + "/site.json", "utf8"));
  return {
    site,
    tzOffset
  };
}

var _layout_server = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 0;
let component_cache;
const component = async () => component_cache ??= (await import('./_layout.svelte-9b837e41.js')).default;
const server_id = "src/routes/+layout.server.js";
const imports = ["_app/immutable/nodes/0.0d720637.js","_app/immutable/chunks/scheduler.b29f3093.js","_app/immutable/chunks/index.7aebdd36.js","_app/immutable/chunks/index.eede6470.js","_app/immutable/chunks/index.ed2d54e5.js","_app/immutable/chunks/index.2f161581.js"];
const stylesheets = ["_app/immutable/assets/0.d2e53a0b.css"];
const fonts = [];

export { component, fonts, imports, index, _layout_server as server, server_id, stylesheets };
//# sourceMappingURL=0-ef536ec4.js.map

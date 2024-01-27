import fs from 'fs-extra';
import { p as public_env } from './shared-server-58a5f352.js';

async function load({ params, route, url, cookies, request }) {
  let site = JSON.parse(fs.readFileSync(public_env.PUBLIC_KENER_FOLDER + "/site.json", "utf8"));
  const headers = request.headers;
  const userAgent = headers.get("user-agent");
  let localTz = "GMT";
  const localTzCookie = cookies.get("localTz");
  if (!!localTzCookie) {
    localTz = localTzCookie;
  }
  let showNav = true;
  if (url.pathname.startsWith("/embed")) {
    showNav = false;
  }
  let isBot = false;
  if (userAgent?.includes("Chrome-Lighthouse") || userAgent?.includes("bot")) {
    isBot = true;
  }
  return {
    site,
    localTz,
    showNav,
    isBot
  };
}

var _layout_server = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 0;
let component_cache;
const component = async () => component_cache ??= (await import('./_layout.svelte-2823acc9.js')).default;
const server_id = "src/routes/+layout.server.js";
const imports = ["_app/immutable/nodes/0.5d079638.js","_app/immutable/chunks/scheduler.c2c0974e.js","_app/immutable/chunks/index.5b988c7b.js","_app/immutable/chunks/globals.7f7f1b26.js","_app/immutable/chunks/ctx.4220f49e.js","_app/immutable/chunks/index.b6690f7e.js","_app/immutable/chunks/index.4e2c25ba.js"];
const stylesheets = ["_app/immutable/assets/0.0d0f9fde.css"];
const fonts = [];

export { component, fonts, imports, index, _layout_server as server, server_id, stylesheets };
//# sourceMappingURL=0-753cfd6b.js.map

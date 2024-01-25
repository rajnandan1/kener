import axios from 'axios';

async function load({ params, route, url, parent }) {
  const { data } = await axios.get("https://raw.githubusercontent.com/rajnandan1/kener/main/docs.md");
  return {
    md: data
  };
}

var _page_server = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 4;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-dcbc0353.js')).default;
const server_id = "src/routes/docs/+page.server.js";
const imports = ["_app/immutable/nodes/4.e188fbc4.js","_app/immutable/chunks/scheduler.86230e0b.js","_app/immutable/chunks/index.ced845ca.js","_app/immutable/chunks/globals.7f7f1b26.js","_app/immutable/chunks/ctx.150f748f.js","_app/immutable/chunks/index.f62c5b43.js","_app/immutable/chunks/Icon.9554439d.js","_app/immutable/chunks/chevron-down.064cfc05.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server as server, server_id, stylesheets };
//# sourceMappingURL=4-3edf4fa0.js.map

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
const component = async () => component_cache ??= (await import('./_page.svelte-f53fe0c3.js')).default;
const server_id = "src/routes/docs/+page.server.js";
const imports = ["_app/immutable/nodes/4.95cd5d6a.js","_app/immutable/chunks/scheduler.3b52f240.js","_app/immutable/chunks/index.e0f9dde7.js","_app/immutable/chunks/globals.7f7f1b26.js","_app/immutable/chunks/Icon.55f18d08.js","_app/immutable/chunks/index.df550c81.js","_app/immutable/chunks/card-content.2099a051.js","_app/immutable/chunks/chevron-down.2e6263fc.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server as server, server_id, stylesheets };
//# sourceMappingURL=4-632bbfea.js.map

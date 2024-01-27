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
const component = async () => component_cache ??= (await import('./_page.svelte-504e1b19.js')).default;
const server_id = "src/routes/docs/+page.server.js";
const imports = ["_app/immutable/nodes/4.fe79dfb9.js","_app/immutable/chunks/scheduler.c2c0974e.js","_app/immutable/chunks/index.5b988c7b.js","_app/immutable/chunks/globals.7f7f1b26.js","_app/immutable/chunks/ctx.4220f49e.js","_app/immutable/chunks/index.b6690f7e.js","_app/immutable/chunks/Icon.51fe0f7f.js","_app/immutable/chunks/events.09388442.js","_app/immutable/chunks/chevron-down.bdc4d823.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server as server, server_id, stylesheets };
//# sourceMappingURL=4-7109638a.js.map

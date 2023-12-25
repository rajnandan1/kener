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

const index = 3;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-db7dbbf9.js')).default;
const server_id = "src/routes/docs/+page.server.js";
const imports = ["_app/immutable/nodes/3.789898fb.js","_app/immutable/chunks/scheduler.1b18627c.js","_app/immutable/chunks/index.a0ccbbe4.js","_app/immutable/chunks/each.e59479a4.js","_app/immutable/chunks/card-content.02ecb8a3.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server as server, server_id, stylesheets };
//# sourceMappingURL=3-8cfd0bbd.js.map

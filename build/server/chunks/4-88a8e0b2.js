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
const component = async () => component_cache ??= (await import('./_page.svelte-f5dc29c8.js')).default;
const server_id = "src/routes/docs/+page.server.js";
const imports = ["_app/immutable/nodes/4.67b330c5.js","_app/immutable/chunks/scheduler.8852886c.js","_app/immutable/chunks/index.fb8f3617.js","_app/immutable/chunks/globals.7f7f1b26.js","_app/immutable/chunks/ctx.1e61a5a6.js","_app/immutable/chunks/index.97524e95.js","_app/immutable/chunks/Icon.7b7db889.js","_app/immutable/chunks/events.b4751e74.js","_app/immutable/chunks/chevron-down.f8b4fb7d.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server as server, server_id, stylesheets };
//# sourceMappingURL=4-88a8e0b2.js.map

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
const component = async () => component_cache ??= (await import('./_page.svelte-d381d79d.js')).default;
const server_id = "src/routes/docs/+page.server.js";
const imports = ["_app/immutable/nodes/4.b62b9ee0.js","_app/immutable/chunks/scheduler.36bfad59.js","_app/immutable/chunks/index.76a7851a.js","_app/immutable/chunks/globals.7f7f1b26.js","_app/immutable/chunks/Icon.22c2c156.js","_app/immutable/chunks/index.a41bf830.js","_app/immutable/chunks/card-content.b04fef6d.js","_app/immutable/chunks/events.74eec825.js","_app/immutable/chunks/chevron-down.f5cb0116.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server as server, server_id, stylesheets };
//# sourceMappingURL=4-f5c7f6c7.js.map

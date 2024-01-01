import fs from 'fs-extra';

async function load({ params, route, url, parent }) {
  const data = fs.readFileSync("/Users/raj/kener/docs.md", "utf8");
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
const component = async () => component_cache ??= (await import('./_page.svelte-a36a0a0c.js')).default;
const server_id = "src/routes/docs/+page.server.js";
const imports = ["_app/immutable/nodes/3.21622bf4.js","_app/immutable/chunks/scheduler.0e55af49.js","_app/immutable/chunks/index.7fa4eb0f.js","_app/immutable/chunks/ctx.b7ea881a.js","_app/immutable/chunks/index.3cd3e9b4.js","_app/immutable/chunks/chevron-down.2b71fd98.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server as server, server_id, stylesheets };
//# sourceMappingURL=3-96344d28.js.map

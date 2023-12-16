const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([".DS_Store","confetti.gif","favicon.png","google.png","issue.png","kener/cashfree-payments-day-json.json","kener/cashfree-payments.90day.json","kener/google-search-day-json.json","kener/google-search.90day.json","kener/monitors.json","kener/site.json","kener/svelte-website-day-json.json","kener/svelte-website.90day.json","kener/vrs-day-json.json","kener/vrs.90day.json","kener/webhook-only-day-json.json","kener/webhook-only.90day.json","kener.png","logo.svg","logo_hero.png","robots.txt","ss.png","ss2.png","ss3.png","svelte.svg"]),
	mimeTypes: {".gif":"image/gif",".png":"image/png",".json":"application/json",".svg":"image/svg+xml",".txt":"text/plain"},
	_: {
		client: {"start":"_app/immutable/entry/start.12ff8fb0.js","app":"_app/immutable/entry/app.2b24cfcc.js","imports":["_app/immutable/entry/start.12ff8fb0.js","_app/immutable/chunks/scheduler.b29f3093.js","_app/immutable/chunks/singletons.02517815.js","_app/immutable/chunks/index.2f161581.js","_app/immutable/entry/app.2b24cfcc.js","_app/immutable/chunks/scheduler.b29f3093.js","_app/immutable/chunks/index.32e7cd16.js"],"stylesheets":[],"fonts":[]},
		nodes: [
			__memo(() => import('./chunks/0-0165236b.js')),
			__memo(() => import('./chunks/1-bbb23143.js')),
			__memo(() => import('./chunks/2-36b22649.js')),
			__memo(() => import('./chunks/3-c4d23eed.js')),
			__memo(() => import('./chunks/4-0c3c898b.js'))
		],
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/api/post",
				pattern: /^\/api\/post\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-315e3406.js'))
			},
			{
				id: "/api/today",
				pattern: /^\/api\/today\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-f49f614c.js'))
			},
			{
				id: "/docs",
				pattern: /^\/docs\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/incident/[id]",
				pattern: /^\/incident\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			}
		],
		matchers: async () => {
			
			return {  };
		}
	}
}
})();

const prerendered = new Set([]);

export { manifest, prerendered };
//# sourceMappingURL=manifest.js.map

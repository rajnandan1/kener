const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([".DS_Store","confetti.gif","favicon.png","google.png","issue.png","kener/cashfree-payments-day-json.json","kener/cashfree-payments.90day.json","kener/google-search-day-json.json","kener/google-search.90day.json","kener/monitors.json","kener/site.json","kener/svelte-website-day-json.json","kener/svelte-website.90day.json","kener/webhook-only-day-json.json","kener/webhook-only.90day.json","kener.png","logo.svg","logo_hero.png","robots.txt","ss.png","ss2.png","ss3.png","svelte.svg"]),
	mimeTypes: {".gif":"image/gif",".png":"image/png",".json":"application/json",".svg":"image/svg+xml",".txt":"text/plain"},
	_: {
		client: {"start":"_app/immutable/entry/start.8764aee0.js","app":"_app/immutable/entry/app.1cbce177.js","imports":["_app/immutable/entry/start.8764aee0.js","_app/immutable/chunks/scheduler.4b6b5798.js","_app/immutable/chunks/singletons.ff6fb23c.js","_app/immutable/chunks/index.addbbfd3.js","_app/immutable/entry/app.1cbce177.js","_app/immutable/chunks/scheduler.4b6b5798.js","_app/immutable/chunks/index.7f0074cb.js"],"stylesheets":[],"fonts":[]},
		nodes: [
			__memo(() => import('./chunks/0-14c42655.js')),
			__memo(() => import('./chunks/1-bdc90f37.js')),
			__memo(() => import('./chunks/2-771a8b67.js')),
			__memo(() => import('./chunks/3-f2587af2.js')),
			__memo(() => import('./chunks/4-33610416.js'))
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
				endpoint: __memo(() => import('./chunks/_server-fa78ed53.js'))
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

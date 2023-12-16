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
		client: {"start":"_app/immutable/entry/start.4b7cf1f2.js","app":"_app/immutable/entry/app.4223d475.js","imports":["_app/immutable/entry/start.4b7cf1f2.js","_app/immutable/chunks/scheduler.b29f3093.js","_app/immutable/chunks/singletons.165d7dc8.js","_app/immutable/chunks/index.2f161581.js","_app/immutable/entry/app.4223d475.js","_app/immutable/chunks/scheduler.b29f3093.js","_app/immutable/chunks/index.7aebdd36.js"],"stylesheets":[],"fonts":[]},
		nodes: [
			__memo(() => import('./chunks/0-29c4e5d0.js')),
			__memo(() => import('./chunks/1-07752a50.js')),
			__memo(() => import('./chunks/2-503244ba.js')),
			__memo(() => import('./chunks/3-99004f09.js')),
			__memo(() => import('./chunks/4-58c19338.js'))
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

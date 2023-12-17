const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([".DS_Store","confetti.gif","favicon.png","google.png","issue.png","k512.png","k96.png","kener/cashfree-payments-day-json.json","kener/cashfree-payments.0day.utc.json","kener/cashfree-payments.90day.json","kener/cashfree-payments.90day.utc.json","kener/google-search-day-json.json","kener/google-search.0day.utc.json","kener/google-search.90day.json","kener/google-search.90day.utc.json","kener/monitors.json","kener/site.json","kener/svelte-website-day-json.json","kener/svelte-website.0day.utc.json","kener/svelte-website.90day.json","kener/svelte-website.90day.utc.json","kener/vrs-day-json.json","kener/vrs.90day.json","kener/webhook-only-day-json.json","kener/webhook-only.90day.json","kener.png","logo.svg","logo_hero.png","robots.txt","ss.png","ss2.png","ss3.png","svelte.svg"]),
	mimeTypes: {".gif":"image/gif",".png":"image/png",".json":"application/json",".svg":"image/svg+xml",".txt":"text/plain"},
	_: {
		client: {"start":"_app/immutable/entry/start.c439582c.js","app":"_app/immutable/entry/app.0992922c.js","imports":["_app/immutable/entry/start.c439582c.js","_app/immutable/chunks/scheduler.ea4d12df.js","_app/immutable/chunks/singletons.e93b3404.js","_app/immutable/chunks/index.7ea6c3d8.js","_app/immutable/entry/app.0992922c.js","_app/immutable/chunks/scheduler.ea4d12df.js","_app/immutable/chunks/index.12c4b772.js"],"stylesheets":[],"fonts":[]},
		nodes: [
			__memo(() => import('./chunks/0-7acdb098.js')),
			__memo(() => import('./chunks/1-8d6b1646.js')),
			__memo(() => import('./chunks/2-149de8a3.js')),
			__memo(() => import('./chunks/3-329dc75f.js')),
			__memo(() => import('./chunks/4-318bc7b9.js'))
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
				endpoint: __memo(() => import('./chunks/_server-aec2caf9.js'))
			},
			{
				id: "/api/today",
				pattern: /^\/api\/today\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-22de44cc.js'))
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

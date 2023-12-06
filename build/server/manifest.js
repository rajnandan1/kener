const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([".DS_Store","favicon.png","google.png","kener/cashfree-payments-day.json","kener/google-search-day.json","kener/monitors.json","kener/site.json","kener/svelte-website-day.json","kener.png","logo.svg","logo_hero.png","robots.txt","ss.png","ss2.png","ss3.png","svelte.svg"]),
	mimeTypes: {".png":"image/png",".json":"application/json",".svg":"image/svg+xml",".txt":"text/plain"},
	_: {
		client: {"start":"_app/immutable/entry/start.9207f08d.js","app":"_app/immutable/entry/app.80bfd5ce.js","imports":["_app/immutable/entry/start.9207f08d.js","_app/immutable/chunks/scheduler.141ea698.js","_app/immutable/chunks/singletons.90ebc4ff.js","_app/immutable/chunks/index.40cf8ae0.js","_app/immutable/entry/app.80bfd5ce.js","_app/immutable/chunks/scheduler.141ea698.js","_app/immutable/chunks/index.1b4fc896.js"],"stylesheets":[],"fonts":[]},
		nodes: [
			__memo(() => import('./chunks/0-0cb09aac.js')),
			__memo(() => import('./chunks/1-5979f2d8.js')),
			__memo(() => import('./chunks/2-b795a899.js')),
			__memo(() => import('./chunks/3-8baa03ac.js')),
			__memo(() => import('./chunks/4-d4678786.js'))
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
				id: "/api/today",
				pattern: /^\/api\/today\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-0c1b6d82.js'))
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

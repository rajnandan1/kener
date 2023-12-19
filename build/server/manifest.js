const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([".DS_Store","confetti.gif","favicon.png","google.png","issue.png","k512.png","k96.png","kener/cashfree-payments.0day.utc.json","kener/google-search.0day.utc.json","kener/monitors.json","kener/site.json","kener/svelte-website.0day.utc.json","kener.png","logo.svg","logo_hero.png","robots.txt","ss.png","ss2.png","ss3.png","svelte.svg"]),
	mimeTypes: {".gif":"image/gif",".png":"image/png",".json":"application/json",".svg":"image/svg+xml",".txt":"text/plain"},
	_: {
		client: {"start":"_app/immutable/entry/start.c5a61492.js","app":"_app/immutable/entry/app.eedb5fd0.js","imports":["_app/immutable/entry/start.c5a61492.js","_app/immutable/chunks/scheduler.ea4d12df.js","_app/immutable/chunks/singletons.9443092b.js","_app/immutable/chunks/index.7ea6c3d8.js","_app/immutable/entry/app.eedb5fd0.js","_app/immutable/chunks/scheduler.ea4d12df.js","_app/immutable/chunks/index.12c4b772.js"],"stylesheets":[],"fonts":[]},
		nodes: [
			__memo(() => import('./chunks/0-5ffb8d1d.js')),
			__memo(() => import('./chunks/1-37705596.js')),
			__memo(() => import('./chunks/2-d42305ad.js')),
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
				id: "/api/status",
				pattern: /^\/api\/status\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-85c8c4bf.js'))
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

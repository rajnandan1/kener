const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([".DS_Store","confetti.gif","earth.png","google.png","kener/cashfree-payments.0day.utc.json","kener/cashfree-payouts.0day.utc.json","kener/earth.0day.utc.json","kener/google-search.0day.utc.json","kener/monitors.json","kener/site.json","kener/svelte-website.0day.utc.json","logo.png","logo96.png","robots.txt","ss.png","ss2.png","ss3.png","svelte.svg"]),
	mimeTypes: {".gif":"image/gif",".png":"image/png",".json":"application/json",".txt":"text/plain",".svg":"image/svg+xml"},
	_: {
		client: {"start":"_app/immutable/entry/start.8db6064e.js","app":"_app/immutable/entry/app.0aad065e.js","imports":["_app/immutable/entry/start.8db6064e.js","_app/immutable/chunks/scheduler.83e0fec9.js","_app/immutable/chunks/singletons.29ddcf3c.js","_app/immutable/chunks/index.3be6ad7f.js","_app/immutable/entry/app.0aad065e.js","_app/immutable/chunks/scheduler.83e0fec9.js","_app/immutable/chunks/index.24520d8d.js"],"stylesheets":[],"fonts":[]},
		nodes: [
			__memo(() => import('./chunks/0-98e7fef7.js')),
			__memo(() => import('./chunks/1-aaff2914.js')),
			__memo(() => import('./chunks/2-a3eee995.js')),
			__memo(() => import('./chunks/3-d34b69dc.js')),
			__memo(() => import('./chunks/4-b9863b51.js'))
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
				endpoint: __memo(() => import('./chunks/_server-b3ec6621.js'))
			},
			{
				id: "/api/today",
				pattern: /^\/api\/today\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-22de44cc.js'))
			},
			{
				id: "/badge/[tag]/status",
				pattern: /^\/badge\/([^/]+?)\/status\/?$/,
				params: [{"name":"tag","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-9b40268b.js'))
			},
			{
				id: "/badge/[tag]/uptime",
				pattern: /^\/badge\/([^/]+?)\/uptime\/?$/,
				params: [{"name":"tag","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-fbd83b4f.js'))
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

const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([".DS_Store","confetti.gif","earth.png","frogment.png","google.png","kener/cashfree-payments.0day.utc.json","kener/cashfree-payouts.0day.utc.json","kener/earth.0day.utc.json","kener/frogment.0day.utc.json","kener/google-search.0day.utc.json","kener/monitors.json","kener/site.json","kener/svelte-website.0day.utc.json","logo.png","logo96.png","robots.txt","ss.png","ss2.png","ss3.png","svelte.svg"]),
	mimeTypes: {".gif":"image/gif",".png":"image/png",".json":"application/json",".txt":"text/plain",".svg":"image/svg+xml"},
	_: {
		client: {"start":"_app/immutable/entry/start.b5ab1f1e.js","app":"_app/immutable/entry/app.76869421.js","imports":["_app/immutable/entry/start.b5ab1f1e.js","_app/immutable/chunks/scheduler.0e55af49.js","_app/immutable/chunks/singletons.7f41d5ad.js","_app/immutable/chunks/index.3cd3e9b4.js","_app/immutable/entry/app.76869421.js","_app/immutable/chunks/scheduler.0e55af49.js","_app/immutable/chunks/index.7fa4eb0f.js"],"stylesheets":[],"fonts":[]},
		nodes: [
			__memo(() => import('./chunks/0-c10236e4.js')),
			__memo(() => import('./chunks/1-3e52d280.js')),
			__memo(() => import('./chunks/2-18b83512.js')),
			__memo(() => import('./chunks/3-ff55fac2.js')),
			__memo(() => import('./chunks/4-5261b32b.js'))
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
				id: "/api/incident",
				pattern: /^\/api\/incident\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-589e42d1.js'))
			},
			{
				id: "/api/incident/[incidentNumber]",
				pattern: /^\/api\/incident\/([^/]+?)\/?$/,
				params: [{"name":"incidentNumber","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-21dfbd18.js'))
			},
			{
				id: "/api/incident/[incidentNumber]/comment",
				pattern: /^\/api\/incident\/([^/]+?)\/comment\/?$/,
				params: [{"name":"incidentNumber","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-d9ce737b.js'))
			},
			{
				id: "/api/incident/[incidentNumber]/status",
				pattern: /^\/api\/incident\/([^/]+?)\/status\/?$/,
				params: [{"name":"incidentNumber","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-e0c327de.js'))
			},
			{
				id: "/api/status",
				pattern: /^\/api\/status\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-e6873bc7.js'))
			},
			{
				id: "/api/today",
				pattern: /^\/api\/today\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-30ce804a.js'))
			},
			{
				id: "/badge/[tag]/status",
				pattern: /^\/badge\/([^/]+?)\/status\/?$/,
				params: [{"name":"tag","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-07e8e63c.js'))
			},
			{
				id: "/badge/[tag]/uptime",
				pattern: /^\/badge\/([^/]+?)\/uptime\/?$/,
				params: [{"name":"tag","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-8ff593c4.js'))
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

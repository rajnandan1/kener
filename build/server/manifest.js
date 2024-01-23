const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([".DS_Store","confetti.gif","earth.png","frogment.png","google.png","kener/cashfree-payments.0day.utc.json","kener/cashfree-payouts.0day.utc.json","kener/earth.0day.utc.json","kener/frogment.0day.utc.json","kener/google-search.0day.utc.json","kener/monitors.json","kener/site.json","kener/svelte-website.0day.utc.json","kener/test-1.0day.utc.json","kener/test-2.0day.utc.json","logo.png","logo96.png","marken_90.png","marken_api.png","marken_badge.png","marken_embed.png","marken_inci.png","marken_share.png","marken_td.png","marken_theme.png","marken_tl.png","paypal.png","robots.txt","ss.png","ss2.png","ss3.png","svelte.svg"]),
	mimeTypes: {".gif":"image/gif",".png":"image/png",".json":"application/json",".txt":"text/plain",".svg":"image/svg+xml"},
	_: {
		client: {"start":"_app/immutable/entry/start.29bc4da8.js","app":"_app/immutable/entry/app.6ea9b2a3.js","imports":["_app/immutable/entry/start.29bc4da8.js","_app/immutable/chunks/scheduler.71bb06cf.js","_app/immutable/chunks/singletons.36827dc9.js","_app/immutable/chunks/index.8fc884bc.js","_app/immutable/chunks/paths.e7306732.js","_app/immutable/entry/app.6ea9b2a3.js","_app/immutable/chunks/scheduler.71bb06cf.js","_app/immutable/chunks/index.0750685b.js"],"stylesheets":[],"fonts":[]},
		nodes: [
			__memo(() => import('./chunks/0-f7cc548d.js')),
			__memo(() => import('./chunks/1-4bb8308b.js')),
			__memo(() => import('./chunks/2-c73ee05b.js')),
			__memo(() => import('./chunks/3-773e0d27.js')),
			__memo(() => import('./chunks/4-874f5411.js')),
			__memo(() => import('./chunks/5-b3d25eab.js')),
			__memo(() => import('./chunks/6-012cfb25.js')),
			__memo(() => import('./chunks/7-24973297.js'))
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
				endpoint: __memo(() => import('./chunks/_server-4b5f65fa.js'))
			},
			{
				id: "/api/incident/[incidentNumber]",
				pattern: /^\/api\/incident\/([^/]+?)\/?$/,
				params: [{"name":"incidentNumber","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-f099852d.js'))
			},
			{
				id: "/api/incident/[incidentNumber]/comment",
				pattern: /^\/api\/incident\/([^/]+?)\/comment\/?$/,
				params: [{"name":"incidentNumber","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-170f9674.js'))
			},
			{
				id: "/api/incident/[incidentNumber]/status",
				pattern: /^\/api\/incident\/([^/]+?)\/status\/?$/,
				params: [{"name":"incidentNumber","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-7c9d54a2.js'))
			},
			{
				id: "/api/status",
				pattern: /^\/api\/status\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-3b31b07f.js'))
			},
			{
				id: "/api/today",
				pattern: /^\/api\/today\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-eaa8e639.js'))
			},
			{
				id: "/badge/[tag]/status",
				pattern: /^\/badge\/([^/]+?)\/status\/?$/,
				params: [{"name":"tag","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-8528da92.js'))
			},
			{
				id: "/badge/[tag]/uptime",
				pattern: /^\/badge\/([^/]+?)\/uptime\/?$/,
				params: [{"name":"tag","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-091e1f30.js'))
			},
			{
				id: "/category-[category]",
				pattern: /^\/category-([^/]+?)\/?$/,
				params: [{"name":"category","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/docs",
				pattern: /^\/docs\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/embed-[tag]",
				pattern: /^\/embed-([^/]+?)\/?$/,
				params: [{"name":"tag","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/embed-[tag]/js",
				pattern: /^\/embed-([^/]+?)\/js\/?$/,
				params: [{"name":"tag","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-d9760477.js'))
			},
			{
				id: "/incident/[id]",
				pattern: /^\/incident\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/monitor-[tag]",
				pattern: /^\/monitor-([^/]+?)\/?$/,
				params: [{"name":"tag","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
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

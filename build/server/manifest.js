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
		client: {"start":"_app/immutable/entry/start.2611031a.js","app":"_app/immutable/entry/app.9baf3b95.js","imports":["_app/immutable/entry/start.2611031a.js","_app/immutable/chunks/scheduler.c2c0974e.js","_app/immutable/chunks/singletons.0d2dde0a.js","_app/immutable/chunks/index.b6690f7e.js","_app/immutable/chunks/paths.06967008.js","_app/immutable/entry/app.9baf3b95.js","_app/immutable/chunks/preload-helper.a4192956.js","_app/immutable/chunks/scheduler.c2c0974e.js","_app/immutable/chunks/index.5b988c7b.js"],"stylesheets":[],"fonts":[]},
		nodes: [
			__memo(() => import('./chunks/0-753cfd6b.js')),
			__memo(() => import('./chunks/1-aaf45a9d.js')),
			__memo(() => import('./chunks/2-d1010717.js')),
			__memo(() => import('./chunks/3-6d2a8fac.js')),
			__memo(() => import('./chunks/4-7109638a.js')),
			__memo(() => import('./chunks/5-08f32b8f.js')),
			__memo(() => import('./chunks/6-fd5f4789.js')),
			__memo(() => import('./chunks/7-7ed918a6.js'))
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
				endpoint: __memo(() => import('./chunks/_server-3e9fe6bc.js'))
			},
			{
				id: "/api/incident/[incidentNumber]",
				pattern: /^\/api\/incident\/([^/]+?)\/?$/,
				params: [{"name":"incidentNumber","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-85265efb.js'))
			},
			{
				id: "/api/incident/[incidentNumber]/comment",
				pattern: /^\/api\/incident\/([^/]+?)\/comment\/?$/,
				params: [{"name":"incidentNumber","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-faf6ca2a.js'))
			},
			{
				id: "/api/incident/[incidentNumber]/status",
				pattern: /^\/api\/incident\/([^/]+?)\/status\/?$/,
				params: [{"name":"incidentNumber","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-3003c71a.js'))
			},
			{
				id: "/api/status",
				pattern: /^\/api\/status\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-526da8a6.js'))
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
				id: "/incident/[id]/comments",
				pattern: /^\/incident\/([^/]+?)\/comments\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server-ed1bcec8.js'))
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

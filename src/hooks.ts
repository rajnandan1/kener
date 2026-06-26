import type { Reroute } from "@sveltejs/kit";

// Back-compat for issue #759: heartbeat URLs used to be `/ext/heartbeat/<tag>:<secret>`,
// one path segment joined by a colon. A `:` is illegal in Windows file paths, so the
// route is now `/ext/heartbeat/<tag>/<secret>` (two segments). Legacy colon-form URLs
// live forever in external cron jobs / uptime pingers, so rewrite them internally to
// the new path. Returns a 200 (no redirect) — heartbeat clients often don't follow 3xx.
//
// `reroute` is a *universal* hook: it MUST be in src/hooks.ts. A `reroute` exported from
// src/hooks.server.ts is silently ignored by SvelteKit. Keep this file free of
// server-only imports — it is bundled for the client too. Must stay pure/side-effect-free.
//
// The transform is in-place (no path reconstruction), so any KENER_BASE_PATH prefix is
// preserved automatically. `[^/:]+` matches the validated tag charset; only the first
// colon after `/ext/heartbeat/<tag>` is rewritten.
const LEGACY_HEARTBEAT = /(\/ext\/heartbeat\/[^/:]+):/;

export const reroute: Reroute = ({ url }) => {
  if (LEGACY_HEARTBEAT.test(url.pathname)) {
    return url.pathname.replace(LEGACY_HEARTBEAT, "$1/");
  }
};

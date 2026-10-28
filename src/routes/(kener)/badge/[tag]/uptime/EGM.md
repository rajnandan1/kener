# Uptime Badge

## Overview

This route serves `GET /badge/{tag}/uptime`. It returns a shields-style SVG badge with the uptime percentage of a monitor over a time window. The `(kener)` route group adds no URL segment.

## Interface

- `+server.ts` exports `GET`. It is the only HTTP method.
- The handler passes the path parameter `tag` and the query parameters `sinceLast`, `hideDuration`, `label`, `labelColor`, `color`, and `style` to `GetBadge("uptime", ...)` in `src/lib/server/controllers/monitorsController.ts`.
- `GetBadge` applies the defaults. `sinceLast` is 7776000 seconds (90 days) when it is missing, not a number, or below 60. `color` is `#0079FF`. `labelColor` is `#333`. `style` is `flat` unless the value is in `BADGE_STYLES` in `src/lib/global-constants.ts`.
- The tag `_` selects all monitors with `status = "ACTIVE"` and `is_hidden = "NO"`.
- The route sets only `Content-Type: image/svg+xml`. `privateCacheHandle` in `src/hooks.server.ts` adds `cache-control: private` when the request carries the `kener-user` cookie.

## Invariants

- `GetBadge` returns HTTP 200 with the static `ErrorSvg` image from `src/lib/anywhere.ts` for an unknown, inactive, or hidden monitor. It does not return a 404.
- The route does no sign-in check and no page check. The `ACTIVE` and not-hidden filter in `GetBadge` is the only visibility check.
- For one monitor, `UptimeCalculator` in `src/lib/server/tool.ts` uses the uptime formula in that monitor's `monitor_settings_json` (`uptime_formula_numerator` and `uptime_formula_denominator`). For `_`, it uses the default formula.
- For `_`, `GetBadge` does not check for an empty monitor list before it calls `db.getStatusCountsByInterval` in `src/lib/server/db/repositories/monitoring.ts`. With no active monitors, the query has an empty `IN ()` list.

## Side Effects

- `GetBadge` reads the `monitors`, `monitoring_data`, and `site_data` tables. It writes nothing and does not use Redis on this path.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
- The code reads the database, so a change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.

# Status Dot Badge

## Overview

This route serves `GET /badge/{tag}/dot`. It returns a 32 x 32 SVG image: a circle in the color of the latest status of one monitor. The `(kener)` route group adds no URL segment. Site owners embed this image in other pages.

## Interface

- `+server.ts` exports `GET`. It is the only HTTP method.
- The path parameter `tag` names one monitor. The value `_` selects all monitors that have `status = "ACTIVE"` and `is_hidden = "NO"`, and `GetLatestStatusActiveAll` in `src/lib/server/controllers/monitorsController.ts` merges their latest statuses into one.
- The query parameter `animate` changes the output only when it is `ping`. Then the SVG adds a second circle that grows and fades in a loop.
- The query parameter `fillColor` sets the circle color. Without it, the route uses the status color from `StatusColor()` in `src/lib/color.ts`.
- For one monitor, the handler calls `GetMonitors({ tag, status: "ACTIVE", is_hidden: "NO" })`, then `GetLastMonitoringValue(tag, () => GetLatestMonitoringData(tag))` from `src/lib/server/cache/setGet.ts`. `GetMonitors` and `GetLatestMonitoringData` are in `src/lib/server/controllers/monitorsController.ts`.
- The response has `Content-Type: image/svg+xml`. The route sets no `Cache-Control` header.

## Invariants

- The filter `status: "ACTIVE", is_hidden: "NO"` is the only check that keeps inactive and hidden monitors out of this route. The route does no sign-in check and no page check.
- An unknown, inactive, or hidden monitor gets HTTP 200 with the static `ErrorSvg` image from `src/lib/anywhere.ts`, not a 404. Image embeds depend on a valid image body.
- The tag `_` skips the monitor check and always draws a dot.
- A monitor with no status uses `GC.NO_DATA`. The dot color for `NO_DATA` comes from `StatusColor()`, and it differs from the `NO_DATA` color of the status badge in `../status/`.

## Side Effects

- The handler reads the Redis key `kener:cache:<tag>:last_status` (time to live 86400 seconds). On a cache miss, it reads the newest `monitoring_data` row for the tag and writes the Redis key.
- For `_`, the handler does this cache read once for each active, visible monitor.
- The handler reads the `monitors`, `monitoring_data`, and `site_data` tables. It writes nothing to the database.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
- The code reads the database, so a change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.

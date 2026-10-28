# Latency Chart Embed (`/embed/latency-<tag>`)

## Overview

This route serves `/embed/latency-<tag>`, a page that other sites put in an iframe. It shows the latency chart of one monitor. The folder name `latency-[tag]` means the URL segment is `latency-` followed by the route parameter `tag`, which is a monitor tag (the unique ID of each monitor).

## Interface

- `+page.server.ts` exports `load`. It returns `{ monitorTag, days, height, theme, metric }`.
- `load` reads these query parameters:
    - `days`: The default is `DEFAULT_DAYS` (90). `load` clamps the value to 1 to `MAX_DAYS` (90).
    - `height`: This is the chart height in pixels. The default is `DEFAULT_HEIGHT` (128), and the minimum is 50.
    - `metric`: The values `average`, `maximum`, and `minimum` select `avgLatency`, `maxLatency`, or `minLatency`. The default is `average`.
    - `theme`: The value `dark` sets dark mode. Any other value sets light mode.
- `load` parses `days` and `height` with `parseIntParam` from `$lib/server/api-server/monitor-bar/shared`. A blank or non-integer value gives the default.
- `+page.svelte` renders `LatencyTrendChart` from `$lib/components/LatencyTrendChart.svelte`, and `Skeleton` while it loads.

## Invariants

- `load` does no database lookup and never throws. Every tag gives status 200.
- The page gets its data from `GET /dashboard-apis/monitor-bar`. That API returns 404 for an unknown, inactive, or hidden monitor, and the page then shows the translated text "Failed to load data".
- For a `metric` value that is not `average`, `maximum`, or `minimum`, the chart shows 0 for every point and hides the latency label.
- `localTz` and `endOfDayTodayAtTz` come from the `(embed)` layout data, not from this `load`.
- The folder has no `js/` route. `src/lib/components/EmbedMenu.svelte` still offers the script embed `/embed/latency-<tag>/js`, and that URL has no route here.
- The route does no auth or permission check.

## Side Effects

- On mount, `+page.svelte` fetches `/dashboard-apis/monitor-bar?tag=<tag>&endOfDayTodayAtTz=<ts>&days=<days>`. It does not URL-encode the tag.
- On mount, `+page.svelte` calls `setMode` from `mode-watcher` when `theme` is set.
- When the fetch fails, the page writes the error to the browser console.

## Verification

- Run: `npm run check` (svelte-kit sync and svelte-check type check).
- Run: `npm run test:server -- "src/routes/(embed)/embed/latency-[tag]"`. The test `page.server.test.ts` checks the defaults, a non-integer value, and the lower limits of `days` and `height`. No test checks the `MAX_DAYS` upper limit.

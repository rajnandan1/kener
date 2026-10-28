# Monitor Status Bar Embed (`/embed/monitor-<tag>`)

## Overview

This route serves `/embed/monitor-<tag>`, a page that other sites put in an iframe. It shows the uptime, the average latency, and the daily status bar of one monitor. The folder name `monitor-[tag]` means the URL segment is `monitor-` followed by the route parameter `tag`, which is a monitor tag (the unique ID of each monitor).

## Interface

- `+page.server.ts` exports `load`. It returns `{ monitorTag, days, theme }`.
- `load` reads these query parameters:
    - `days`: The default is `DEFAULT_DAYS` (90). `load` clamps the value to 1 to `MAX_DAYS` (90). `parseIntParam` from `$lib/server/api-server/monitor-bar/shared` gives the default for a blank or non-integer value.
    - `theme`: The value `dark` sets dark mode. Any other value sets light mode.
- `+page.svelte` renders `StatusBarCalendar` from `$lib/components/StatusBarCalendar.svelte` with `barHeight={30}`, `radius={4}`, and `disableClick={true}`, and `Skeleton` while it loads.
- [js](./js/EGM.md): The child route `/embed/monitor-<tag>/js` returns a script that adds this page to another site as an iframe.

## Invariants

- `load` does no database lookup and never throws. Every tag gives status 200.
- The page gets its data from `GET /dashboard-apis/monitor-bar`. That API returns 404 for an unknown, inactive, or hidden monitor, and the page then shows the translated text "Failed to load data".
- `endOfDayTodayAtTz` comes from the `(embed)` layout data, not from this `load`.
- The page shows the average latency only when the API response has `avgLatency`.
- The route does no auth or permission check.

## Side Effects

- On mount, `+page.svelte` fetches `/dashboard-apis/monitor-bar?tag=<tag>&endOfDayTodayAtTz=<ts>&days=<days>`. It does not URL-encode the tag.
- On mount, `+page.svelte` calls `setMode` from `mode-watcher` when `theme` is set.
- When the fetch fails, the page writes the error to the browser console.

## Verification

- Run: `npm run check` (svelte-kit sync and svelte-check type check).
- Run: `npm run test:server -- "src/routes/(embed)/embed/monitor-[tag]"`. The test `page.server.test.ts` checks the default and the limits of `days`.

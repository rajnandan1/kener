# Embed Page

## Overview

This route serves `/manage/app/embed`. It builds embed code: an `<iframe>` or `<script>` snippet that shows a monitor's status bar, a latency chart, or the live events list on another website. The public `/embed/...` routes serve the embedded content. The page writes no data. It reads through the manage API: the `POST /manage/api` endpoint, which checks a permission for each action.

## Interface

- The page sends `getMonitors` (permission `monitors.read`) with `status: "ACTIVE"` to fill the monitor picker. It selects the first monitor by default.
- The embed type is `status` (status bar), `latency` (latency chart), or `events` (live events). The format is `iframe` or `script`.
- The page builds these paths with `clientResolver`: `/embed/monitor-{tag}`, `/embed/latency-{tag}`, and `/embed/events/live`.
- The script format loads `{embedUrl}/js` with the same query parameters.

## Invariants

- The layout guard in `src/routes/(manage)/+layout.server.ts` lets only users with `settings.read` open this route.
- The defaults are type `status`, format `iframe`, 90 days, height 200, and metric `average`.
- The page leaves out `metric` when it is `average`. It sends `height` only for `latency`.
- An `events` embed sends `incidents` and `maintenance` as `1` or `0`. It sends `tags` (comma-joined) only when at least one monitor is selected.
- The iframe height is 70 for `status`, the chosen height plus 50 for `latency`, and 300 for `events`.

## Side Effects

- The live preview iframe loads the public `/embed` route.
- The copy buttons write the URL and the snippet to the clipboard.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.

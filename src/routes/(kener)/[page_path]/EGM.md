# Named Status Page

## Overview

This route serves `/{page_path}`, for example `/status-a`. It shows one named status page: its header, its monitors with status bars, and its current events. The `(kener)` route group adds no URL segment. The default status page at `/` uses the same code with `page_path = ""`.

## Interface

- `+page.server.ts` exports `load`. It calls `GetPageDashboardData(params.page_path, await parent())` from `src/lib/server/controllers/dashboardController.ts` and returns the result.
- `load` throws 404 `Page Not Found` when `GetPageDashboardData` returns `null`, which happens when no page has that `page_path`.
- The result has the page status, the page details and settings, `monitorTags`, `monitorGroupMembersByTag`, and the ongoing incidents and ongoing and upcoming maintenance events when the event display settings turn them on.
- The route has no form actions.
- `+page.svelte` is the same file as `src/routes/(kener)/+page.svelte`, except for whitespace. In the browser it calls `requestMonitorBar` from `src/lib/client/monitor-bar-client.ts`, which sends one `GET /dashboard-apis/monitor-bars` request for all tags.
- Child routes:
    - [events](./events/EGM.md) holds the monthly events page `/{page_path}/events/{Month}-{Year}`.
    - [rss.xml](./rss.xml/EGM.md) serves the RSS feed `/{page_path}/rss.xml`.

## Invariants

- `load` must pass the layout data from `parent()` to `GetPageDashboardData`. That data carries `canSeeHiddenMonitors`, which is true only for a signed-in user with the `monitors.read` permission.
- `GetPageByPathWithMonitors` in `src/lib/server/controllers/pagesController.ts` keeps only monitors with `status = "ACTIVE"`, and it also keeps only `is_hidden = "NO"` unless `canSeeHiddenMonitors` is true.
- A page whose monitors are all hidden or inactive still returns HTTP 200, with an empty `monitorTags` list.
- The inline incident and maintenance queries skip events whose only monitors are hidden, also for a user who can see hidden monitors. Events with `is_global = "YES"` always show, and their monitor lists leave out hidden monitors.
- SvelteKit matches the file routes next to `[page_path]` first (`rss.xml`, `sitemap.xml`, `captcha-config.json`, and `capture.js`). A page whose `page_path` has one of those names cannot be reached at `/{page_path}`. The folders `badge`, `events`, `incidents`, `maintenances`, `monitors`, and `dashboard-apis` have no route at one segment, so a page with one of those names is still reached at `/{page_path}`.
- `+page.svelte` here and `src/routes/(kener)/+page.svelte` are copies. A fix in one copy must also go into the other copy.
- Page Markdown must go through `SveltePurify`, which removes unsafe HTML.
- The route does no sign-in check. Anyone can see a page.

## Side Effects

- `load` reads the `pages`, `pages_monitors`, `monitors`, and `monitoring_data` tables, and the incident and maintenance tables when inline events are on. It writes nothing.
- The browser sends `GET /dashboard-apis/monitor-bars` and keeps the results in memory until the page reloads.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm run test:server -- "src/routes/(kener)/hidden-monitors.test.ts"`. This test checks that `/{page_path}` hides hidden monitors. No test file is in this directory.
- The code reads the database, so a change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.

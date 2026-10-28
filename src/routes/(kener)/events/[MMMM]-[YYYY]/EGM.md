# Monthly Events Page

## Overview

This route serves `/events/{Month}-{Year}`, for example `/events/January-2026`. It shows the incidents and maintenance events of one month. When the `globalPageVisibilitySettings.forceExclusivity` setting is on, it shows only the events of the default status page. When the setting is off, it shows the events of all monitors. The `(kener)` route group adds no URL segment. The server only checks the month. The browser loads the events.

## Interface

- `+page.server.ts` exports `load`. It joins `params.MMMM` and `params.YYYY` into `monthParam` and parses it with date-fns `parse(monthParam, "MMMM-yyyy", new Date())`.
- `load` returns `{ monthParam, monthStartTs, monthEndTs }`. The two timestamps are Unix seconds.
- `load` throws 404 `Invalid date format` for a month that does not parse. It throws 404 `Date out of allowed range` for a year before `MIN_YEAR` (2023) or for a month after 12 months from now.
- The route has no form actions.
- `+page.svelte` sends `POST /dashboard-apis/events-by-month?page_path=<page_path>` with the body `{ start_ts: monthStartTs, end_ts: monthEndTs }` on mount. It groups the events by day and shows each one with `IncidentItem` (`src/lib/components/IncidentItem.svelte`) or `MaintenanceItem` (`src/lib/components/MaintenanceItem.svelte`). It also shows the incident and maintenance totals and links to the previous and next months.

## Invariants

- `+page.server.ts` here and in `../../[page_path]/events/[MMMM]-[YYYY]/` are the same file. The two `+page.svelte` files differ only in the two total labels. A fix in one copy must also go into the other copy.
- On this route `page.params.page_path` is undefined, so the browser sends `page_path=undefined`. The `events-by-month` handler in `src/lib/server/api-server/events-by-month/post.ts` changes `undefined` and `null` to no page. That conversion must stay.
- `monthEndTs` is `getUnixTime(endOfMonth(parsedDate)) + 86399`. `endOfMonth` already returns the last second of the month, so the window runs about one day into the next month.
- The server computes the month bounds in the server time zone. The page groups events by day in the browser time zone.
- The server range check and the page navigation limits must agree. Both use 2023 as the first year and 12 months from now as the last month.
- A failed fetch shows the empty "No Events" state and no error message.
- The route does no sign-in check.

## Side Effects

- `load` reads nothing from the database. It awaits `parent()` (the layout data) and does not use the result.
- The browser makes one `POST` request to `/dashboard-apis/events-by-month`, which only reads the database.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.

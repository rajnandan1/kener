# client

## Overview

This folder holds browser-side helpers for the status page and the embed pages. The helpers compute day boundaries in the viewer's timezone, set up the locale and timezone stores, fetch monitor bar data in batches, fetch notifications, and build URLs under the SvelteKit base path. A "monitor bar" is the row of per-day status bars that the status page shows for one monitor. The fetch helpers call the public `/dashboard-apis/<action>` endpoints, which need no API key.

## Interface

- `resolveTimezone(timezone)` (`datetime.ts`) returns the timezone, or `"UTC"` when `date-fns-tz` cannot resolve it.
- `getStartOfDayAtTz(timezone)` and `getEndOfDayAtTz(timezone)` (`datetime.ts`) return the start and the end of today in that timezone, as Unix seconds.
- `GetLayoutClientData(languageSetting, fetchFn)` (`layoutClientData.ts`) initialises the `i18n` and `timezone` stores. It returns a `LayoutClientData` object with `localTz`, `startOfDayTodayAtTz`, `nowAtTz`, and `endOfDayTodayAtTz`. `src/routes/(kener)/+layout.ts` and `src/routes/(embed)/+layout.ts` call it.
- `requestMonitorBar(tag, days, endOfDayTodayAtTz)` (`monitor-bar-client.ts`) returns a promise of one monitor's `MonitorBarResponse`. `clearMonitorBarCache()` empties its cache.
- `requestNotifications(monitorTags)` (`notifications-client.ts`) returns a list of `NotificationEvent` objects, a type from `src/lib/types/notifications.ts`.
- `urlResolve(resolve, path, params?)` (`resolver.ts`, the default export) wraps the SvelteKit `resolve` function from `$app/paths`. Most files import it as `clientResolver`. It returns an `http://` or `https://` URL unchanged. About 76 files import it.
- `absoluteResolve(resolve, siteUrl, path, params?)` (`resolver.ts`) puts the site URL in front of the resolved path. Meta tags such as `og:image` need this absolute URL.
- `getSslNowMs()` (`sslClock.svelte.ts`) returns a reactive "now" in milliseconds, so that an SSL certificate label changes when the certificate expires. `src/lib/components/MonitorBar.svelte` and `src/routes/(kener)/monitors/[monitor_tag]/+page.svelte` use it.
- [types](./types/EGM.md) holds the `ProviderDefinition`, `ProviderRequirement`, and `ThemeMode` types.

## Invariants

- The day helpers and `LayoutClientData` use Unix seconds, as all Kener timestamps do. `getEndOfDayAtTz` and `endOfDayTodayAtTz` add 86400 seconds to the start of the day.
- `GetLayoutClientData` must run before a component reads `selectedTimezone`, because it calls `i18n.init` and `timezone.init` from `src/lib/stores/`.
- `requestMonitorBar` rejects when it runs outside the browser (`browser` from `$app/environment`).
- `requestMonitorBar` batches calls. All calls with the same `days` and `endOfDayTodayAtTz` that arrive before a `setTimeout` of 0 ms fires become one request. Each tag then resolves or rejects on its own. A tag that is missing from the response rejects with `Monitor data not found for tag: <tag>`. A failed request rejects every caller in the batch.
- `requestMonitorBar` caches each result in memory under `<tag>:<days>:<endOfDayTodayAtTz>`. The cache lasts until the page reloads or a caller calls `clearMonitorBarCache()`.
- `requestNotifications` throws `Failed to fetch notifications` when the response is not OK. It returns `[]` when the response has no `notifications` field.
- Build every app URL with `urlResolve` or `absoluteResolve`, so that the URL keeps the base path that `KENER_BASE_PATH` sets.
- `monitor-bar-client.ts` imports only the type `MonitorBarResponse` from `src/lib/server/api-server/monitor-bar/get.ts`, with `import type`. No file here imports runtime code from `$lib/server`.

## Side Effects

- `requestMonitorBar` sends GET `/dashboard-apis/monitor-bars?tags=<comma-separated tags>&endOfDayTodayAtTz=<seconds>&days=<n>`.
- `requestNotifications` sends GET `/dashboard-apis/notifications`, with `?tags=<comma-separated tags>` when it gets tags.
- `monitor-bar-client.ts` keeps module-level state: the `pendingBatches` map and the `cache` map.
- `getSslNowMs()` starts one `setInterval` of 30,000 ms in the browser on its first call. Nothing clears it.
- `GetLayoutClientData` reads and writes localStorage through the stores: `kener_preferred_locale` and `kener_preferred_timezone`.

## Verification

- Run `npm run check` (svelte-kit sync and the svelte-check type check).
- Run `npm run test:server -- "src/lib/client"`.

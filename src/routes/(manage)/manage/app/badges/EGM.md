# Badges Page

## Overview

This route serves `/manage/app/badges`. It builds badge URLs: small SVG images of a monitor's status, uptime, or latency that the public `/badge/...` route serves. The page writes no data. It reads through the manage API: the `POST /manage/api` endpoint, which checks a permission for each action.

## Interface

- The page sends `getMonitors` (permission `monitors.read`) with `status: "ACTIVE"` to fill the monitor picker.
- The page sends `getAllSiteData` (permission `settings.read`) and reads only the selected locales from the `i18n` key.
- The page builds the badge URL `{origin}/badge/{tag}/{badgeType}` and adds query parameters.
- The page shows the URL, a Markdown snippet, an HTML `<img>` snippet, and a live preview.

## Invariants

- The layout guard in `src/routes/(manage)/+layout.server.ts` lets only users with `settings.read` open this route.
- `badgeType` is `status`, `uptime`, or `latency`. `metric` is `average`, `maximum`, or `minimum`.
- The tag `_` stands for all monitors. The page picks it when at least one monitor loads.
- The page adds a query parameter only when its value differs from the default. The defaults are `sinceLast` 7776000 seconds (90 days), label color `#555`, color `#0079FF`, style `flat`, and metric `average`.
- `sinceLast` and `hideDuration` apply only to the `uptime` and `latency` badges. `metric` applies only to `latency`. `locale` applies only to `status`.
- The page sends the colors without the leading `#`.

## Side Effects

- The preview `<img>` requests the generated `/badge` URL from the app.
- The copy buttons write the URL and the snippets to the clipboard.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.

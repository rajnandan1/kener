# Analytics Capture Script

## Overview

This route serves `GET /capture.js`. It builds a JavaScript file at request time from the analytics providers that an admin enabled in the settings. The layout in `../+layout.svelte` loads this script on every public page. The `(kener)` route group adds no URL segment.

## Interface

- `+server.ts` exports `GET`.
- `GetAllAnalyticsData` in `src/lib/server/controllers/siteDataController.ts` reads the `site_data` rows whose keys start with `analytics.`.
- The handler knows eight providers. Each one has a settings key and a raw snippet in `src/lib/snippets/capture/`: `analytics.googleTagManager`, `analytics.mixpanel`, `analytics.amplitude`, `analytics.plausible`, `analytics.clarity`, `analytics.umami`, `analytics.posthog`, and `analytics.openpanel`.
- The handler puts each provider's `requirements` values (for example `Measurement ID` or `API Key`) into the snippet placeholders and joins the snippets in that fixed order.
- When no provider is enabled, the body is `//no data`.
- The response has `Content-Type: application/javascript` and `Cache-Control: no-cache`.

## Invariants

- `Cache-Control` must stay `no-cache`. A CDN keeps `.js` files for hours by default, and it would serve the old provider settings after an admin changes them (issue #857).
- The handler escapes every requirement value once with `JSON.stringify` before it puts the value into a double-quoted JavaScript string. Without this step, one quote, backslash, or newline breaks the script for every provider.
- Only entries with `value.isEnabled == true` go into the script.
- The file has `// @ts-nocheck`, so `npm run check` does not type-check it.
- The route does no sign-in check. Anyone can read it.

## Side Effects

- The handler reads the `site_data` table. It writes nothing and makes no network calls. The browser then loads the third-party analytics scripts.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm run test:server -- "src/routes/(kener)/capture.js"`.
- The code reads the database, so a change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.

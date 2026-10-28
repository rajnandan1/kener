# Dashboard API Dispatcher

## Overview

This route serves `/dashboard-apis/{action}`. It sends each request to the handler file `src/lib/server/api-server/{action}/{method}.ts`. The public status pages call these endpoints from the browser to load monitor bars, charts, events, and subscriptions. The `(kener)` route group adds no URL segment. These endpoints are not the `/api/v4` API, which needs an API key.

## Interface

- `+server.ts` exports `GET`, `POST`, `PUT`, and `DELETE`. Each one calls `getHandler(action, method)` from `src/lib/server/api-server/index.ts` and passes an `APIServerRequest` with `action`, `query` (the URL search parameters), `cookies`, and `headers`. `POST` and `PUT` also pass `body: await request.json()`.
- An unknown action or method returns 404 with the message `Handler not found for <METHOD> /<action>`.
- These actions exist now:
    - `GET monitor-bar`, `GET monitor-bars`, and `GET monitor-latency-chart` return status bar and latency data for monitors.
    - `GET notifications` returns the notification payload (incidents and maintenance events) for the monitor tags in the `tags` query parameter. Without tags, it returns only events with `is_global = "YES"`.
    - `GET pages` returns the title, path, header, and logo of every page.
    - `POST events-by-month` returns the incidents and maintenance events between `start_ts` and `end_ts`, for the page in the `page_path` query parameter.
    - `POST monitor-day-status`, `POST monitor-day-latency`, `POST monitor-day-incidents`, and `POST monitor-day-maintenances` return the details of one monitor for one day.
    - `POST subscription` handles the email subscription steps `login`, `verify`, `getPreferences`, and `updatePreferences`.
- No `put.ts` or `delete.ts` handler exists, so `PUT` and `DELETE` always return 404.

## Invariants

- `index.ts` finds handlers with `import.meta.glob` on `./*/get.ts`, `./*/post.ts`, `./*/put.ts`, and `./*/delete.ts`. A new action is a new folder in `src/lib/server/api-server/` with one of these files and a default export of type `APIHandler`.
- This route does no sign-in check and no permission check. Each handler decides visibility. The handlers that can show hidden monitors call `CanSeeHiddenMonitors` in `src/lib/server/controllers/userController.ts`, which is true only for a signed-in user with the `monitors.read` permission.
- `monitor-bar` always leaves out hidden monitors, also for a signed-in user.
- The route looks up the handler before it reads the body, so an unknown action returns 404 even with a bad body.
- `POST` and `PUT` always call `request.json()`. An empty or invalid JSON body throws, and the response is 500, not 400.

## Side Effects

- `GET monitor-bars` writes a Redis cache entry with the key prefix `kener:cache:status_counts_grouped:` and a time to live of 60 seconds.
- `GET monitor-bar` and `GET monitor-bars` read the Redis key `kener:cache:<tag>:last_status` for each SSL monitor through `AttachSslCacheFields` in `src/lib/server/controllers/monitorsController.ts`. They do not write that key.
- `POST subscription` with `login` can call the captcha provider's verify endpoint, writes a 6-digit code to `subscriber_users`, and sends an email. `verify` writes `subscriber_users` and `subscriber_methods`. `updatePreferences` writes `user_subscriptions_v2`.
- All other actions only read the database.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test file is in this directory. `src/routes/(kener)/hidden-monitors.test.ts` tests the hidden-monitor rules of several handlers. `src/lib/server/api-server/monitor-bars/get.test.ts` and `src/lib/server/api-server/subscription/post.test.ts` test two handlers.
- The handlers read and write the database, so a change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.

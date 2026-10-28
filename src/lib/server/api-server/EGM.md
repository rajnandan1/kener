# api-server

## Overview

This folder holds the JSON handlers that the public status page and the embed pages call from the browser. Each child folder is one action. The SvelteKit route `src/routes/(kener)/dashboard-apis/[action]/+server.ts` serves every action at `/dashboard-apis/<action>`, and `index.ts` maps the action name and HTTP method to a handler.

## Interface

- `index.ts` exports `getHandler(action, method)`. It returns the handler for that action and method, or `null`. The route answers 404 `Handler not found for <METHOD> /<action>` when it gets `null`.
- A handler is a default export of type `APIHandler` from `src/lib/server/types/api-server.ts`. It gets an `APIServerRequest` with `action`, `query`, `cookies`, `headers`, and, for `POST` and `PUT`, the parsed JSON `body`.
- The actions are:
    - [events-by-month](./events-by-month/EGM.md) (`POST`) returns the incidents and maintenance events in a time range, optionally for one page.
    - [monitor-bar](./monitor-bar/EGM.md) (`GET`) returns one monitor's status bar data. Its `shared.ts` holds the response builders.
    - [monitor-bars](./monitor-bars/EGM.md) (`GET`) returns status bar data for up to 100 monitors.
    - [monitor-day-incidents](./monitor-day-incidents/EGM.md) (`POST`) returns one monitor's incidents for one day.
    - [monitor-day-latency](./monitor-day-latency/EGM.md) (`POST`) returns one monitor's latency points and stats for one day.
    - [monitor-day-maintenances](./monitor-day-maintenances/EGM.md) (`POST`) returns one monitor's maintenance events for one day.
    - [monitor-day-status](./monitor-day-status/EGM.md) (`POST`) returns one monitor's status per minute and uptime for one day.
    - [monitor-latency-chart](./monitor-latency-chart/EGM.md) (`GET`) returns bucketed latency for a range from `1h` to `30d`.
    - [notifications](./notifications/EGM.md) (`GET`) returns the event list for a set of monitors.
    - [pages](./pages/EGM.md) (`GET`) returns the status page navigation list.
    - [subscription](./subscription/EGM.md) (`POST`) runs the subscriber email sign-in and preference flow.

## Invariants

- The folder name sets the URL, and the file name sets the method. `index.ts` loads only `./<action>/get.ts`, `post.ts`, `put.ts`, and `delete.ts` with `import.meta.glob`, at build time. Other files in an action folder, such as `shared.ts` or a test file, never become routes.
- A new action needs only a new folder with one of those four files. No list registers it.
- The route adds no auth check. Each handler does its own visibility check. Most monitor handlers show a hidden monitor (`is_hidden` = `YES`) only to a logged-in user who has the `monitors.read` permission, but `monitor-bar` hides it from everyone.
- The route calls `request.json()` for `POST` and `PUT`, so a request with no JSON body fails before the handler runs.
- All timestamps in requests and responses are Unix seconds.

## Side Effects

- `index.ts` imports every handler module when it loads. It has no other side effects.
- The handlers read the database through `db` and the controllers in `src/lib/server/controllers/`. Only `subscription` writes, through `userSubscriptionsController.ts`, and it can send email.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm run test:server -- "src/lib/server/api-server"`. This runs the tests in `monitor-bars/` and `subscription/`.
- Run: `npm run test:server -- "src/routes/(kener)/hidden-monitors.test.ts"`. This test checks hidden monitor visibility across most handlers.
- The handlers read the database, so a change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.

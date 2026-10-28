# src

## Overview

This folder holds the SvelteKit app. `lib/` holds the code that routes import through `$lib`, and `routes/` holds the route tree. The files directly in this folder are the app type declarations, the HTML shells, and the hooks: the request middleware that SvelteKit runs before every route.

## Interface

- `app.d.ts` declares `App.Locals` with the optional fields `user` (`SessionUser`), `monitor` (`MonitorRecordTyped`), `incident` (`IncidentRecord` without `incident_source`), `maintenance` (`MaintenanceRecord`), and `page` (`PageRecord`). It declares `App.PageData` with the optional field `currentUser`. No code in `src` sets `locals.user` or `currentUser`. The dashboard pages get the signed-in user as `userDb` from `src/routes/(manage)/+layout.server.ts`.
- `hooks.server.ts` exports `handle`, which is `sequence(csrfHandle, privateCacheHandle, apiAuthHandle)`.
    - `csrfHandle` returns 403 for a `POST`, `PUT`, `PATCH`, or `DELETE` request with a form content type (`application/x-www-form-urlencoded`, `multipart/form-data`, or `text/plain`) when the `Origin` host is not `event.url.host`.
    - `privateCacheHandle` sets `cache-control: private` when the `kener-user` cookie is present and the response has no `cache-control` header.
    - `apiAuthHandle` reads a `Bearer` token from the `Authorization` header of an API request and checks it with `VerifyAPIKey` from `src/lib/server/controllers/apiController.ts`. It returns a 401 `UNAUTHORIZED` JSON error for a missing, malformed, or bad key, and a 404 `NOT_FOUND` JSON error when no route matches.
    - After the key check, `apiAuthHandle` resolves the route params into `event.locals`: `monitor_tag` through `GetMonitorsParsed` in `src/lib/server/controllers/monitorsController.ts`, `incident_id` through `db.getIncidentById`, `maintenance_id` through `db.getMaintenanceById`, and `page_path` through `db.getPageByPath` (`GC.HOME_PAGE_TOKEN` in `src/lib/global-constants.ts` maps to `""`). `db` is the default export of `src/lib/server/db/db.ts`. Each lookup returns a 404 JSON error when it finds no record.
- `hooks.ts` exports `reroute`, which rewrites the legacy path `/ext/heartbeat/<tag>:<secret>` to `/ext/heartbeat/<tag>/<secret>` inside the server, without a redirect.
- `app.html` is the page shell. `error.html` is the static fallback page that SvelteKit shows when rendering fails. It shows the status code and reloads every 30 seconds.
- Child folders:
    - [lib](./lib/EGM.md): The `$lib` code: shared helpers and constants, browser helpers, components, stores, types, and all server-only code in `lib/server/`.
    - [routes](./routes/EGM.md): The route tree in eight route groups: `(account)`, `(api)`, `(assets)`, `(docs)`, `(embed)`, `(ext)`, `(kener)`, and `(manage)`.

## Invariants

- `isApiRequest` in `hooks.server.ts` uses the matched route id (prefix `/(api)/`), so a percent-encoded path such as `/%61pi/...` cannot skip the key check. It falls back to the raw `/api/` path prefix only when no route matched.
- `apiAuthHandle` checks the key before it resolves route params. A request with no valid key cannot learn whether a monitor, incident, maintenance, or page exists.
- `parseId` in `hooks.server.ts` accepts only decimal digit strings up to `MAX_ID` (2147483647, the PostgreSQL integer limit). Any other id becomes a 404 and never reaches the database.
- `csrfHandle` lets a request through when it has no `Origin` header or the value `"null"`, and relies on SameSite=Lax cookies for it.
- `svelte.config.js` sets `kit.csrf.trustedOrigins` to `["*"]`, which turns off the SvelteKit CSRF check. `csrfHandle` is the only CSRF (cross-site request forgery) protection.
- `hooks.server.ts` does not check sessions and does not redirect. The `(manage)` layout in `src/routes/(manage)/+layout.server.ts` checks the session of the dashboard pages.
- `reroute` must stay in `hooks.ts`, because SvelteKit ignores a `reroute` in `hooks.server.ts`. `hooks.ts` is also bundled for the browser, so it must have no server-only imports.
- `reroute` rewrites only the first colon after `/ext/heartbeat/<tag>` and changes the path in place, so the `KENER_BASE_PATH` prefix stays.

## Side Effects

- `hooks.server.ts` calls `InstallEnvProxy()` from `$lib/server/proxy` once when the module loads. That call installs the proxy from the environment in the SvelteKit server process.
- `apiAuthHandle` reads the database on API requests and sets `event.locals.monitor`, `incident`, `maintenance`, and `page` for the API handlers.
- `apiAuthHandle` removes the `Link` header from every response that goes through it, not only API responses.
- `reroute` is a pure function of `url.pathname`.

## Verification

- Run `npm run check` (svelte-kit sync and the svelte-check type check).
- Run `npm run test:server -- "src/hooks.server.test.ts"`.

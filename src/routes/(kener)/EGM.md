# (kener) Public Status Page Routes

## Overview

`(kener)` is a SvelteKit route group: the parentheses mean that the folder name adds no URL segment. The group holds the public status page: the default page at `/`, the named pages, the monitor, incident, and maintenance pages, the monthly events pages, and the badge, RSS, sitemap, captcha, analytics, and browser data endpoints. The files in this folder supply the shared layout, the error page, and the `/` page.

## Interface

- `+layout.server.ts` exports `load`. It calls `GetLayoutServerData(cookies, request)` from `src/lib/server/controllers/layoutController.ts` and returns the result. It throws `redirect(302, serverResolve("/account/signin"))` when `isSetupComplete` is false.
- The layout data carries `canSeeHiddenMonitors`, `eventDisplaySettings`, `isMobile`, the site settings (name, URL, logo, favicon, colors, font, `customCSS`), and the signed-in user, among other fields.
- `+layout.ts` exports `load`. It adds the client time zone values from `GetLayoutClientData` in `src/lib/client/layoutClientData.ts` and returns `{ ...data, ...clientData }`. `GetLayoutClientData` also initializes the i18n store with `data.languageSetting`. In the browser it calls `setMode(theme)` from `mode-watcher` only when `localStorage` has no `mode-watcher-mode` key.
- `+layout.svelte` adds the favicon, an RSS `alternate` link, the font stylesheet, the status color CSS variables, the `customCSS` setting, and the `/capture.js` script to the page head. It renders `KenerNav` (`src/lib/components/KenerNav.svelte`), the page content, and `KenerFooter` (`src/lib/components/KenerFooter.svelte`).
- `+page.server.ts` exports `load` for `/`. It calls `GetPageDashboardData("", await parent())` from `src/lib/server/controllers/dashboardController.ts` and throws 404 `Page Not Found` when no page has `page_path = ""`.
- `+page.svelte` renders the default status page. It is a copy of `./[page_path]/+page.svelte`. In the browser it loads all status bars with one `GET /dashboard-apis/monitor-bars` request through `requestMonitorBar` in `src/lib/client/monitor-bar-client.ts`.
- `+error.svelte` shows the HTTP status and the error message, with "Go Back" and "Home" buttons.
- Child routes:
    - [[page_path]](<./[page_path]/EGM.md>) serves the named status page `/{page_path}`, its monthly events page, and its RSS feed.
    - [badge](./badge/EGM.md) serves the SVG badges `/badge/{tag}/dot`, `latency`, `status`, and `uptime`.
    - [captcha-config.json](./captcha-config.json/EGM.md) serves the active captcha provider and its public site key.
    - [capture.js](./capture.js/EGM.md) serves the analytics script that the `analytics.*` settings build.
    - [dashboard-apis](./dashboard-apis/EGM.md) sends `/dashboard-apis/{action}` requests to the handlers in `src/lib/server/api-server/`.
    - [events](./events/EGM.md) serves the monthly events page `/events/{Month}-{Year}`.
    - [incidents](./incidents/EGM.md) serves the incident page `/incidents/{incident_id}`.
    - [maintenances](./maintenances/EGM.md) serves the maintenance page `/maintenances/{id}`.
    - [monitors](./monitors/EGM.md) serves the monitor page `/monitors/{monitor_tag}` and its RSS feed.
    - [rss.xml](./rss.xml/EGM.md) serves the RSS feed of the default status page.
    - [sitemap.xml](./sitemap.xml/EGM.md) serves the sitemap in the mode that the `sitemap` setting selects.

## Invariants

- Every page route in the group runs the layout server `load`. When setup is not complete, every page route redirects to `/account/signin`. Setup is complete when `KENER_SECRET_KEY` is set, `ORIGIN` and `REDIS_URL` are defined, and the `site_data` table is not empty. SvelteKit does not run layout loads for the `+server.ts` endpoints (the badges, the feeds, the sitemap, `captcha-config.json`, `capture.js`, and `/dashboard-apis`), so these endpoints do not redirect.
- `canSeeHiddenMonitors` decides who sees hidden monitors (`is_hidden = "YES"`). `GetLayoutServerData` sets it once per request. It is true only for a signed-in, active user with the `monitors.read` permission. Each page load that shows monitors must read it from `parent()` and pass it on.
- No route in the group requires sign-in. Anonymous users see every page, and hidden monitors are left out for them.
- `+layout.svelte` puts the status colors and the `customCSS` setting into a `<style>` tag with `{@html}` and no escaping. The values come from the site settings, so the code trusts whoever can edit those settings.
- `+page.svelte` here and `./[page_path]/+page.svelte` are copies. A fix in one copy must also go into the other copy.
- The `/` page fetches status bars only in the browser, and a `requestVersion` counter drops responses from an older request.
- `src/hooks.server.ts` sets `cache-control: private` on a response for a signed-in user when the route sets no `cache-control` header, because such a response can contain hidden monitors.

## Side Effects

- The layout server `load` reads the `kener-user` session cookie and the `localLang` cookie. It sets no cookies.
- The layout server `load` reads the site data, the user count, the signed-in user, and that user's permissions from the database on every request. The `/` page also reads the `pages`, `pages_monitors`, `monitors`, and `monitoring_data` tables, and the incident and maintenance tables when inline events are on. Nothing in this folder writes to the database.
- The browser loads `/capture.js` and the font stylesheet, and it sends `GET /dashboard-apis/monitor-bars`.
- `+layout.ts` can write the `mode-watcher-mode` key to `localStorage` through `setMode`.
- `GetLayoutClientData` calls `timezone.init()`, which writes the `kener_preferred_timezone` key to `localStorage` when that key holds no valid time zone.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm run test:server -- "src/routes/(kener)"`. This runs `hidden-monitors.test.ts`, which checks the hidden-monitor rules of `/`, `/{page_path}`, `/monitors/{tag}`, `/incidents/{id}`, `/maintenances/{id}`, several `/dashboard-apis` handlers, and the subscriber emails for anonymous users, users without `monitors.read`, and users with it. It also runs the tests in `captcha-config.json/` and `capture.js/`.
- The code reads the database, so a change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.

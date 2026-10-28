# Embed Route Group (`(embed)`)

## Overview

`(embed)` is a SvelteKit route group (a folder in parentheses that shares a layout and does not appear in the URL). Its layout wraps every page under `/embed/`. These pages go into an iframe on other sites. The layout gives them the site theme, the status colors, the font, the locale, and the time zone data, without the status page header, navigation, or footer.

## Interface

- `+layout.server.ts` exports `load`. It returns the result of `GetLayoutServerData(cookies, request)` from `$lib/server/controllers/layoutController`. The fields that the embed layout uses are `defaultSiteTheme`, `favicon`, `font`, `siteStatusColors`, `siteStatusColorsDark`, and `languageSetting`.
- `+layout.ts` exports `load`. It calls `GetLayoutClientData(data.languageSetting, fetch)` from `$lib/client/layoutClientData` and returns the server data plus `localTz`, `startOfDayTodayAtTz`, `nowAtTz`, and `endOfDayTodayAtTz`.
- `+layout.svelte` imports `layout.css`, `kener.css`, and `embed.css` from `src/routes/`. It renders `ModeWatcher` with `defaultMode={data.defaultSiteTheme}` and `Toaster`, and wraps the page in `<main class="kener-public embed-app">`.
- [embed](./embed/EGM.md): The folder holds the pages `/embed/events/live`, `/embed/latency-<tag>`, and `/embed/monitor-<tag>`, and the script `/embed/monitor-<tag>/js`.

## Invariants

- The layout adds `<meta name="robots" content="noindex, nofollow">`, so search engines do not index embed pages.
- The layout writes the CSS variables `--up`, `--degraded`, `--down`, `--maintenance`, `--accent`, `--accent-foreground`, and `--font-family` into a `<style>` tag with `{@html}`. The values come from the site settings `colors`, `colorsDark`, and `font`, which an admin sets.
- `endOfDayTodayAtTz` is `startOfDayTodayAtTz + 86400` (one day in seconds) in the selected time zone. The monitor and latency pages send it to `/dashboard-apis/monitor-bar`.
- The layout does no auth or permission check. It reads the login session, but no embed page uses it to allow or block access.

## Side Effects

- `GetLayoutServerData` reads the tables `site_data` and `users` on every request. For a logged-in user, it also calls `CanSeeHiddenMonitors` in `src/lib/server/controllers/userController.ts`, which reads `users_roles`, `roles`, and `roles_permissions` to check the `monitors.read` permission. It also reads the `kener-user` session cookie and the `localLang` locale cookie.
- `GetLayoutClientData` sets up the `i18n` store, which loads the locale file from `src/lib/locales/` for the selected locale.
- `GetLayoutClientData` sets up the time zone store, which reads the saved time zone from `localStorage` and falls back to the browser time zone. When no valid time zone is saved, `timezone.init()` writes the browser time zone to `localStorage`.
- `ModeWatcher` reads and stores the light or dark mode in the browser.
- The layout loads the site favicon and, when the site sets `font.cssSrc`, the font stylesheet from that URL.

## Verification

- Run: `npm run check` (svelte-kit sync and svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
- The layout reads the database, so a change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.

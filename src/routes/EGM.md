# routes

## Overview

This folder is the SvelteKit route tree of Kener. Each child folder is a route group: a folder name in parentheses that shares a layout and adds no URL segment. The files directly in this folder are the root error page and the stylesheets that the route groups import.

## Interface

- `+error.svelte` is the root error boundary. It reads `page.status` and `page.error` from `$app/state`. For a 5xx status it shows "This status page is temporarily unavailable". For other statuses it shows "Something went wrong" with `page.error?.message` or a default message. It always shows the status code.
- The stylesheets `docs.css`, `embed.css`, `fonts.css`, `kener.css`, `layout.css`, `manage.css`, `prose.css`, and `theme.css` live here. The route group layouts import `layout.css`, `kener.css`, `docs.css`, `prose.css`, `manage.css`, and `embed.css`. No file imports `fonts.css` or `theme.css`.
- Route groups:
    - [(account)](<./(account)/EGM.md>): The group serves the pages under `/account/`: sign-in, sign-out, password reset, invitations, email verification, and OIDC (OpenID Connect) sign-in.
    - [(api)](<./(api)/EGM.md>): The group serves the public REST API under `/api/v4/`. `src/hooks.server.ts` requires a Bearer API key for every route in it.
    - [(assets)](<./(assets)/EGM.md>): The group serves images that the database stores, at `/assets/images/[id]`, without an API key.
    - [(docs)](<./(docs)/EGM.md>): The group serves the optional documentation site under `/docs`. The default `npm run build` leaves it out.
    - [(embed)](<./(embed)/EGM.md>): The group serves the pages under `/embed/` that other sites put in an iframe.
    - [(ext)](<./(ext)/EGM.md>): The group serves the endpoints that outside systems call, such as `/ext/heartbeat/[tag]/[secret]`, without an API key.
    - [(kener)](<./(kener)/EGM.md>): The group serves the public status page: pages, monitors, incidents, maintenances, events, badges, RSS feeds, and the sitemap.
    - [(manage)](<./(manage)/EGM.md>): The group serves the admin dashboard under `/manage`. Its layout sends a visitor with no session to the sign-in page and checks the permission of each dashboard page.

## Invariants

- `+error.svelte` uses only its own `<style>` block and `page` state. That block is scoped, except for the global rule `:global(body) { margin: 0; }`. It uses no app CSS and no server data, so it still renders when a layout load fails, for example when the database is unreachable.
- `+error.svelte` adds `<meta http-equiv="refresh" content="30">` only for a 5xx status.
- API key checks depend on the route group. `apiAuthHandle` in `src/hooks.server.ts` checks a key only when the matched route id starts with `/(api)/`, or, when no route matched, when the raw path starts with `/api/`. A new endpoint that outside callers use without a key belongs in `(ext)` or `(assets)`, not in `(api)`.

## Side Effects

- `+error.svelte` makes the browser reload the page every 30 seconds while it shows a 5xx error.
- `+error.svelte` sets the document `<title>` to `<status> — Status page temporarily unavailable` for a 5xx status and to `<status> — Something went wrong` for other statuses. It never puts `page.error.message` in the title.
- `+error.svelte` sets `margin: 0` on the global `body`.

## Verification

- Run `npm run check` (svelte-kit sync and the svelte-check type check).
- Run `npm test` (the full suite). No test covers the files directly in this folder.

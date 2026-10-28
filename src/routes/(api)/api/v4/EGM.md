# Kener API v4 (`/api/v4`)

## Overview

This folder holds the public REST API (version 4) of Kener. Scripts and other services call it with a Bearer API key to manage monitors, incidents, maintenances, pages, images, and site settings. The folder has no source file of its own, only the route folders below and two test files.

These rules hold for every route in this tree:

- `src/hooks.server.ts` runs before every route. It returns a JSON 401 without a valid Bearer API key, and a JSON 404 when no route matches. It also loads the record named in the URL into `locals.monitor`, `locals.incident`, `locals.maintenance`, or `locals.page`, or returns a JSON 404 when that record does not exist.
- Each route writes through the controllers in `src/lib/server/controllers/`, the same files that the dashboard (`src/routes/(manage)/manage/api/+server.ts`) uses. Some routes call a function that the dashboard does not call. For example, `PATCH /api/v4/monitors/{monitor_tag}` saves through `UpdateMonitor`, and `PATCH /api/v4/incidents/{incident_id}` calls `ClearIncidentEndTime`. A route may call only `get*` methods on `db` directly.
- Every error that a handler returns has the shape `{ error: { code, message } }`. The codes are `BAD_REQUEST` (400), `UNAUTHORIZED` (401), `NOT_FOUND` (404), and `INTERNAL_ERROR` (500). A duplicate returns 400, not 409. An error that a handler does not catch gets the SvelteKit default 500 response, which does not have this shape, because `src/hooks.server.ts` has no `handleError`.
- Event times in requests and responses are UTC seconds. The record fields `created_at` and `updated_at` are ISO 8601 strings. Most write handlers round the event times down to the start of the minute with `GetMinuteStartTimestampUTC`.
- `src/lib/types/api.ts` holds the request and response types. `static/api-references/v4.json` is the OpenAPI 3.1 spec for the same 18 routes. `AGENTS.md` asks you to get the maintainer's approval before you change a request or response shape.

Two test files sit directly in this folder:

- `write-parity.test.ts` runs every v4 write and the matching dashboard write on the same seeded database, and checks that both leave the same table rows, queue pushes, cache writes, and OIDC config cache clears. It runs on in-memory SQLite, or on the PostgreSQL or MySQL server in `TEST_DATABASE_URL`. It empties the tables of that database, so point it only at a throwaway server.
- `no-direct-db-writes.test.ts` reads every `+server.ts` in this tree and fails when one calls a `db` method whose name does not start with `get`.

Run `npm run test:server -- "src/routes/(api)/api/v4"` to run every test in this tree. Run `npm run check` for the type check.

## Subdirectories & Boundaries

- images: [images](./images/EGM.md) - `POST /api/v4/images` uploads one PNG, JPEG, WebP, or HEIC image, resizes it with sharp, and stores it in the `images` table.
- incidents: [incidents](./incidents/EGM.md) - These routes list, create, read, edit, and delete incidents and their comments. A new comment is the one write that emails incident subscribers through `subscriberQueue`.
- maintenances: [maintenances](./maintenances/EGM.md) - These routes manage maintenances (planned work on an RRULE schedule) and their events (the single windows). They also search events across all maintenances.
- monitors: [monitors](./monitors/EGM.md) - These routes list, create, edit, and delete monitors, and read or overwrite their per-minute monitoring data. Secrets in `type_data` are masked on every read.
- pages: [pages](./pages/EGM.md) - These routes list, create, edit, and delete status pages and their ordered monitor lists. The home page is addressed as `~home` and cannot be deleted or moved.
- site: [site](./site/EGM.md) - These routes read every site setting and read or set one setting in `site_data`. Secrets in `oidcSettings` and the `captcha.*` keys are masked.

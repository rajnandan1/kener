# Site Settings API (`/api/v4/site`)

## Overview

This read-only route lists every site setting. A site setting is one key-value row in the `site_data` table. `src/hooks.server.ts` checks the Bearer API key before the handler runs.

## Interface

- `GET` calls `db.getAllSiteData` and returns `{ site_data }`, a list of `{ key, value, data_type }`.
- [[config_key]](<./[config_key]/EGM.md>): this child route reads and sets one setting.

## Invariants

- The handler parses `value` with `JSON.parse` when `data_type` is `object`, and returns other values as stored strings. A stored `object` value that is not valid JSON makes the request fail.
- `MaskSiteDataSecret` from `$lib/server/controllers/siteDataController` masks the secret in `oidcSettings` and in each `captcha.*` key before the response leaves.

## Side Effects

- `GET` reads `site_data`. It writes nothing.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
- A change here reads the database, so it must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.

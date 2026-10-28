# Site Setting API (`/api/v4/site/{config_key}`)

## Overview

This route reads and sets one site setting. A site setting is one key-value row in the `site_data` table, for example `title` or `oidcSettings` (the OpenID Connect sign-in settings). `src/hooks.server.ts` checks the Bearer API key before a handler runs.

## Interface

- `GET` returns `{ key, value, data_type }` for the key, with `value` passed through `MaskSiteDataSecret` from `$lib/server/controllers/siteDataController`.
- `PATCH` takes a JSON body with a required `value` of any JSON type. It calls `InsertKeyValue` and `GetSiteDataByKey` from the same controller. It returns `{ key, value, data_type }` with the saved value, masked.

## Invariants

- `config_key` must be a key in `siteDataKeys` from `$lib/server/controllers/siteDataKeys`. Any other key returns 404.
- `GET` also returns 404 when the key has no stored row. `PATCH` creates that row instead.
- `PATCH` turns `value` into a string before it checks it: `JSON.stringify` for an `object` key, `String()` for every other key. The `isValid` check of the key entry must accept that string, or the handler returns 400.
- Two kinds of key hold a secret: `oidcSettings` at `client_secret`, and each `captcha.*` key at `requirements` > `Secret Key`. `MaskSiteDataSecret` replaces all but the last 4 characters of the secret with `*`.
- When a `PATCH` body sends the secret masked or leaves it out, `InsertKeyValue` keeps the stored secret. An empty string clears it. A masked secret with no stored secret saves an empty string.
- The handlers call only `get*` methods on `db`. `src/routes/(api)/api/v4/no-direct-db-writes.test.ts` fails when a v4 route calls a `db` write method directly.

## Side Effects

- `PATCH` inserts or updates one `site_data` row through `db.insertOrUpdateSiteData`.
- A `PATCH` of `oidcSettings` also clears the OIDC config cache through `ClearOidcConfigCache`.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm run test:server -- "src/routes/(api)/api/v4/site/[config_key]"`.
- A change here reads and writes the database, so it must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.

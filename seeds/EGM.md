# seeds

## Overview

This folder holds six Knex seeds. A seed is a file that inserts default rows. Knex runs the seeds in alphabetical filename order: `generate_template.ts`, `monitors.ts`, `pages.ts`, `permissions.ts`, `roles.ts`, and `site_data.ts`. In dev, `npm run seed` runs them (`npx knex seed:run`). In production, `scripts/main.ts` runs them with `db.seed.run()` at every start, after the migrations. `knexfile.ts` points Knex at this folder with `seeds.directory: "./seeds"`.

## Interface

- Every file exports `seed(knex: Knex): Promise<void>`.
- `generate_template.ts` inserts five email templates into `general_email_templates`: subscription account code, subscription update, forgot password, invite user, and verify email. It imports them from `src/lib/server/templates/general/`.
- `monitors.ts` inserts the default monitors from `src/lib/server/db/seedMonitorData.ts` into `monitors`.
- `pages.ts` inserts the pages from `src/lib/server/db/seedPagesData.ts` into `pages`. For the home page (`page_path` is `""`), it links the monitors with the tags `earth` and `kener` in `pages_monitors`.
- `permissions.ts` inserts each id from the `permissions` list in `src/lib/allPerms.ts` that the `permissions` table does not have, and deletes each row whose id is not in the list. It never updates `permission_name` on an existing row, so a renamed permission does not reach an existing database.
- `roles.ts` inserts the read-only roles `admin`, `editor`, and `member` into `roles` and sets their links in `roles_permissions`. `admin` gets every permission. `editor` gets every permission except `api_keys.delete`. `member` gets only the permissions whose id ends in `.read`. When the legacy column `users.role` still exists, `roles.ts` also copies its values into `users_roles`.
- `site_data.ts` inserts each key of `src/lib/server/db/seedSiteData.ts` into `site_data`. It stores an object value as a JSON string.

## Invariants

- Every seed must be safe to run at every start:
    - `generate_template.ts` inserts a template only when its `template_id` is missing. It never updates a template, so a changed template does not reach a database that already has the row.
    - `monitors.ts` and `pages.ts` insert only when their table is empty.
    - `site_data.ts` inserts a key only when the key is missing. It never overwrites a value that a user changed.
    - `permissions.ts` and `roles.ts` insert the missing rows. They also delete the rows that no longer match (see Side Effects).
- The import rule comes from the "Migrations and Seeds" section of `CODING_STANDARDS.md`. Knex runs seeds from source on plain Node, which resolves neither `$lib` nor a `.js` path to a `.ts` file. So a seed imports only files that have no imports of their own, by a relative path that ends in `.ts`, for example `import { permissions } from "../src/lib/allPerms.ts"`. Today the seeds import `src/lib/server/db/seedSiteData.ts`, `src/lib/server/db/seedMonitorData.ts`, `src/lib/server/db/seedPagesData.ts`, `src/lib/allPerms.ts`, and the files in `src/lib/server/templates/general/`.
- The production image copies only those files, in the "Seed data files" block of `Dockerfile`. A seed that imports a new file needs a new `COPY` line there. `AGENTS.md` says to ask the maintainer before you edit `Dockerfile`.
- The alphabetical order matters. `monitors.ts` must run before `pages.ts`, and `permissions.ts` must run before `roles.ts`. A renamed seed file can break this order without an error.
- No seed reads an environment variable.

## Side Effects

- The seeds write `general_email_templates`, `monitors`, `pages`, `pages_monitors`, `permissions`, `roles`, `roles_permissions`, `users_roles`, and `site_data`. They read `users`.
- `permissions.ts` deletes each `permissions` row whose id is not in `src/lib/allPerms.ts`. `migrations/20260330120000_add_rbac_tables.ts` declares `roles_permissions.permissions_id` with `onDelete("CASCADE")`. So where the engine enforces foreign keys, the delete also removes that permission from every role, custom roles included.
- `roles.ts` deletes the `roles_permissions` links of `admin`, `editor`, and `member` that are not in its mapping. So each production start reverts a manual permission change on these three roles.

## Verification

- Run `npm run check` (svelte-kit sync and the svelte-check type check). Its include list in `.svelte-kit/tsconfig.json` covers `src/**`, the `vite.config` files, `test/**`, and `tests/**`, so it does not type check this folder. It does check the files that the seeds import.
- Run `npm run migrate`, then `npm run seed`. Run `npm run seed` a second time to check that a rerun adds no rows.
- The change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows: start the throwaway servers, then run `DATABASE_URL=<url> npm run migrate` and `DATABASE_URL=<url> npm run seed` for each one.
- Run `npm test` (the full suite). Vitest includes only `src/**` tests, so no Vitest test covers this folder directly.

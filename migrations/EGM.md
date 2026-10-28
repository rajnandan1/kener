# migrations

## Overview

This folder holds the 31 Knex migrations that build the Kener database schema on SQLite, PostgreSQL, and MySQL. A migration is a file that changes the schema by one step. Knex runs the files in filename order and records each file that it ran in the `knex_migrations` table. In dev, `npm run migrate` runs them (`vite-node scripts/fix-migration-ext.ts && npx knex migrate:latest`). In production, `scripts/main.ts` runs them with `db.migrate.latest()` at every start. `knexfile.ts` points Knex at this folder with `migrations.directory: "./migrations"`.

## Interface

- Every file exports two functions and nothing else. `up(knex: Knex): Promise<void>` applies the change, and `down(knex: Knex): Promise<void>` reverts it.
- Each filename has the form `YYYYMMDDHHMMSS_name.ts`. The timestamp sets the run order.
- These files create the tables of each area:
    - `20250111153517_init.ts` creates `monitors`, `monitoring_data`, `monitor_alerts`, `site_data`, `triggers`, `users`, `api_keys`, `incidents`, `incident_monitors`, and `incident_comments`.
    - `20250315091330_add_table_invitations.ts` creates `invitations`.
    - `20250417144954_add_subscription_tables.ts` creates `subscribers`, `subscriptions`, and `subscription_triggers`. `20260128120000_redesign_subscription_system.ts` creates `subscriber_users`, `subscriber_methods`, and `user_subscriptions_v2`.
    - `20260106120000_add_images_table.ts` creates `images`.
    - `20260107120000_add_pages_tables.ts` creates `pages` and `pages_monitors`.
    - `20260109120000_add_maintenances_tables.ts` creates `maintenances`, `maintenance_monitors`, and `maintenances_events`.
    - `20260124120000_add_monitor_alerts_config_tables.ts`, `20260124120001_monitor_alert_config_id.ts`, and `20260325120000_multi_monitor_alerts.ts` create the alert tables `monitor_alerts_config`, `monitor_alerts_config_triggers`, `monitor_alerts_v2`, and `monitor_alerts_config_monitors`.
    - `20260128145145_add_general_email_templates.ts` creates `general_email_templates`.
    - `20260330120000_add_rbac_tables.ts` creates the RBAC (role-based access control) tables `roles`, `permissions`, `roles_permissions`, and `users_roles`.
    - `20260831130000_add_oidc_support.ts` adds OIDC (OpenID Connect) login: the columns `users.auth_provider` and `users.oidc_sub`, and the table `oidc_group_role_mappings`.
- The other files add or change columns and indexes. Each filename names its change.

## Invariants

- A migration that has shipped stays as it is. Make each schema change in a new file with a later timestamp. Two shipped filenames have typos (`maintenace`, `colum`), and they stay that way.
- Guard each change with `knex.schema.hasTable` or `hasColumn`, so that `up` can run twice. `20260613120000_add_confirmation_threshold_and_raw_status.ts` shows the pattern. 26 of the 31 files do this. `20260114120000_remove_monitors_name_unique.ts`, `20260216095021_index_monitoring_data.ts`, and `20260617120000_add_monitoring_data_covering_index.ts` use `try/catch` instead. `20260328120000_fix_sqlite_monitor_alerts_config_nullable.ts` checks the engine and `PRAGMA table_info`. `20260310120000_alter_page_subheader_to_text.ts` has no guard.
- Knex runs each migration in a transaction. On PostgreSQL, an SQL error aborts that transaction even when a `try/catch` catches the error, so the later statements of the migration fail. So in a new migration, use `hasTable` or `hasColumn` rather than `try/catch`.
- Write schema changes with the Knex schema builder. When raw SQL is unavoidable, branch on the engine. The migrations branch on `knex.client.config.client` (`sqlite3` or `better-sqlite3`, `pg`, and `mysql2`). They cannot use `GetDbType()` from `src/lib/server/tool.ts`, because of the import rule below.
- The import rule comes from the "Migrations and Seeds" section of `CODING_STANDARDS.md`. Knex runs migrations from source on plain Node, which strips types but resolves neither `$lib` nor a `.js` path to a `.ts` file. So a migration may import only a file that has no imports of its own, by a relative path that ends in `.ts`. Today the only import in this folder is `import type { Knex } from "knex";`.
- Check that `defaultTo()` and `notNullable()` behave the same on all three engines. Yes/no flags are strings here: `monitors.is_hidden` and `users.is_owner` default to `"NO"`, and `is_global` on `incidents` and `maintenances` defaults to `"YES"`.
- Some migrations need an earlier one. `20260328120000_fix_sqlite_monitor_alerts_config_nullable.ts` expects `20260325120000_multi_monitor_alerts.ts` to have run. `20260331120000_remove_role_from_users.ts` needs the `roles` and `users_roles` tables from `20260330120000_add_rbac_tables.ts`.

## Side Effects

- The migrations create, alter, and index the tables above in the database that `DATABASE_URL` selects. SQLite is the default.
- Some migrations also change rows:
    - `20260226120000_add_is_owner_to_users.ts` sets `is_owner` to `"YES"` on the user with the lowest id.
    - `20260331120000_remove_role_from_users.ts` inserts the roles `admin`, `editor`, and `member`. It reads each `users.role` into memory, drops `users.role`, and then inserts the `users_roles` rows. It maps the old role `user`, and any other unknown role, to `member`.
    - `20260325120000_multi_monitor_alerts.ts` copies each `monitor_alerts_config.monitor_tag` into `monitor_alerts_config_monitors` and fills `monitor_alerts_v2.monitor_tag`. On SQLite, it rebuilds the `monitor_alerts_config` table.
    - `20260831120000_monitoring_data_autovacuum.ts` runs on PostgreSQL only. It sets the autovacuum settings of `monitoring_data` and runs `ANALYZE`.
    - `20261019120000_widen_images_data_on_mysql.ts` runs on MySQL only. It changes `images.data` to `longtext`.
- Knex writes to `knex_migrations` and `knex_migrations_lock`. `scripts/fix-migration-ext.ts` and `scripts/main.ts` rename old `.js` names in `knex_migrations` to `.ts` before they run the migrations.

## Verification

- Run `npm run check` (svelte-kit sync and the svelte-check type check). Its include list in `.svelte-kit/tsconfig.json` covers `src/**`, the `vite.config` files, `test/**`, and `tests/**`, so it does not type check this folder.
- Run `npm run migrate`, then `npm run seed`, on SQLite.
- The change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows: start the throwaway servers, then run `DATABASE_URL=<url> npm run migrate` and `DATABASE_URL=<url> npm run seed` for each one.
- Run `npm test` (the full suite). Vitest includes only `src/**` tests, so no Vitest test covers this folder directly. Database tests under `src` run these migrations. For example, `src/routes/(api)/api/v4/write-parity.test.ts` loads them with `import.meta.glob("/migrations/*.ts")`.

# Kener — Agent Instructions

## Overview

Kener is an open-source status page: monitors, uptime tracking, incidents, maintenances, and public dashboards. It is a TypeScript app on **SvelteKit 2 (Svelte 5)**, served in production by **Express**. It stores data with **Knex.js** on SQLite (default), PostgreSQL, or MySQL, and runs jobs on **BullMQ + Redis**.

## Build & Run

```bash
cp .env-min.example .env   # sets KENER_SECRET_KEY, REDIS_URL, ORIGIN
npm run dev                # runs migrations + seeds first, then vite dev and the scheduler in parallel
npm run build              # leaves out src/routes/(docs)/; npm run build-with-docs includes it
npm run seed               # migrations, then seeds
```

Dev needs Redis on `REDIS_URL`. `docker compose -f docker-compose.dev.yml up -d redis` starts one on port 6379.

Two processes run in dev: the SvelteKit dev server (`vite dev`) and the scheduler (`vite-node src/lib/server/startup.ts`), which runs monitor checks, the maintenance scheduler, and daily cleanup. In production, `scripts/main.ts` is the single entry point: Express + SvelteKit handler + migrations + seeds + scheduler.

Environment: `KENER_SECRET_KEY`, `ORIGIN`, and `REDIS_URL` are required. `DATABASE_URL` is optional and defaults to `sqlite://./database/kener.sqlite.db` (other forms: `postgresql://...`, `mysql://...`). The full list is in `src/routes/(docs)/docs/content/v4/setup/environment-variables.md`.

## Testing

Vitest has two projects in `vite.config.ts`:

- `server` runs `src/**/*.test.ts` in Node, except `*.svelte.test.ts`.
- `client` runs `src/**/*.svelte.test.ts` in headless Chromium through Playwright, with setup in `vitest-setup-client.ts`. Install the browser once: `npx playwright install chromium`.

Tests sit next to the code they test (`apiCall.ts` and `apiCall.test.ts`). Both projects run in UTC.

```bash
npm run test:server -- src/lib/server/tool.test.ts   # one file
npm run test:server -- -t "test name"                # one test by name
```

## Project Structure

```text
scripts/main.ts             production entry point
src/hooks.server.ts         auth; sets locals.monitor / incident / maintenance / page for API routes
src/routes/(kener)/         public status page
src/routes/(manage)/        admin dashboard (authenticated)
src/routes/(api)/api/v4/    public REST API: incidents, maintenances, monitors, pages, site
src/routes/(embed)/         embeddable widgets
src/routes/(docs)/          docs site; content in docs/content/v4/, navigation in docs.json
src/routes/(account)/  (ext)/  (assets)/
src/lib/server/startup.ts   scheduler process for dev
src/lib/server/services/    one <type>Call.ts per monitor type; service.ts picks one by monitor_type
src/lib/server/schedulers/  croner jobs: monitors, maintenances, daily cleanup
src/lib/server/queues/      BullMQ queues: monitor execute/response, alerting, email, subscriber
src/lib/server/controllers/ domain logic that routes call
src/lib/server/db/          db.ts singleton; dbimpl.ts binds the repositories/*.ts classes
src/lib/server/api-server/  Express-side handlers, file-routed as ./<action>/<method>.ts
src/lib/components/ui/      shadcn-svelte components
src/lib/locales/            one {code}.json per language
migrations/  seeds/         Knex
```

A new monitor type touches `MONITOR_TYPES` in `src/lib/types/monitor.ts`, `src/lib/server/services/` (a `<type>Call.ts` and a branch in `service.ts`), `src/lib/server/types/monitor.ts`, and a form in `src/routes/(manage)/manage/app/monitors/[tag]/types/monitor-<type>.svelte`.

Types go by where they are used: `src/lib/types/` (shared), `src/lib/server/types/` (server only), `src/lib/client/types/` (client only). Import them with `import type { ... }`.

New language: add `src/lib/locales/{code}.json` with `name` and `mappings`. The server and client discover it from the folder. `node scripts/check-translations.js` checks the translations.

## Coding Standards

**Coding standards** live in `CODING_STANDARDS.md`. Read it before you write or review code, a migration, or a database query.

## Svelte MCP

When the Svelte MCP server is connected:

1. Call `list-sections` first for any Svelte or SvelteKit question, then `get-documentation` for every relevant section.
2. Run `svelte-autofixer` on Svelte code before you hand it over. Repeat until it reports no issues.
3. Call `playground-link` only when the user asks, and never for code written to project files.

## Skills and Agent Docs

- Svelte components (`.svelte`, `.svelte.ts`): `.claude/skills/svelte-code-writer/SKILL.md`.
- Docs in `src/routes/(docs)/docs/content/` or `src/routes/(docs)/docs.json`: `.claude/skills/documentation-writer/SKILL.md`. This one is mandatory. Keep docs short and action-oriented.
- Tailwind: `.claude/skills/tailwindcss/SKILL.md`. shadcn-svelte: `.claude/skills/ss-shadcn-svelte/SKILL.md`.
- Issues live in GitHub Issues for `rajnandan1/kener`: `docs/agents/issue-tracker.md`. Triage labels: `docs/agents/triage-labels.md`. Domain docs: `docs/agents/domain.md`.

## Boundaries

- ✅ **Always do:** Run `npm run check` and `npm test` before a pull request. Add a co-located test for new server logic. Keep database code working on all three engines.
- ⚠️ **Ask first:** Adding a dependency. Changing the database schema. Changing `/api/v4` request or response shapes. Editing `.github/workflows/`, `Dockerfile`, or the `docker-compose*.yml` files.
- 🚫 **Never do:** Edit a migration that has shipped; add a new migration instead. Store timestamps in milliseconds. Push directly to `main`.

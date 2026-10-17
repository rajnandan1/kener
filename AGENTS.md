# Kener — Agent Instructions

## Overview

Kener is an open-source status page: monitors, uptime tracking, incidents, maintenances, and public dashboards. It is a TypeScript app on **SvelteKit 2 (Svelte 5)**, served in production by **Express**. It stores data with **Knex.js** on SQLite (default), PostgreSQL, or MySQL, and runs jobs on **BullMQ + Redis**.

## Build & Run

```bash
cp .env-min.example .env   # sets the required KENER_SECRET_KEY, REDIS_URL, ORIGIN
npm run dev                # runs migrations + seeds first, then vite dev and the scheduler in parallel
npm run build              # leaves out src/routes/(docs)/; npm run build-with-docs includes it
npm run seed               # migrations, then seeds
```

Dev needs Redis on `REDIS_URL`. `docker compose -f docker-compose.dev.yml up -d redis` starts one on port 6379.

## Finish a Change

Work on a branch and merge to `main` through a pull request. Before you open it:

1. Add a test next to new server logic (`apiCall.ts` and `apiCall.test.ts`).
2. Format only the files you changed: `npx prettier --write <files>`. Many files in the repo are not formatted yet, so a repo-wide `npm run prettify` rewrites unrelated code.
3. Run `npm run check` and `npm test`. Both pass.

## Ask First

Ask the maintainer before you:

- Add a dependency.
- Change the database schema.
- Change `/api/v4` request or response shapes.
- Edit `.github/workflows/`, `Dockerfile`, or the `docker-compose*.yml` files.

## Guides

- **Coding standards**: read `CODING_STANDARDS.md` before you write or review code, a migration, or a database query.
- **Tests**: read `docs/agents/testing.md` before you write a test or run a single test.
- **Monitor types**: read `docs/agents/monitor-types.md` before you add or change a monitor type.
- **Locales**: read `docs/agents/locales.md` before you add a language or edit a translation.
- **Project structure**: read `docs/agents/project-structure.md` before you search for where a feature lives.
- **Environment variables**: read `src/routes/(docs)/docs/content/v4/setup/environment-variables.md` before you add or read one.
- **Svelte**: read `.claude/skills/svelte-code-writer/SKILL.md` before you create or edit a `.svelte` or `.svelte.ts` file. With the Svelte MCP server connected, also read `docs/agents/svelte-mcp.md`.
- **Docs site**: read `.claude/skills/documentation-writer/SKILL.md` before you edit `src/routes/(docs)/docs/content/` or `src/routes/(docs)/docs.json`.
- **Tailwind**: read `.claude/skills/tailwindcss/SKILL.md` before you style with Tailwind classes.
- **shadcn-svelte**: read `.claude/skills/ss-shadcn-svelte/SKILL.md` before you add or use a component from `src/lib/components/ui/`.
- **Issues**: read `docs/agents/issue-tracker.md` before you create, read, or update a GitHub issue in `rajnandan1/kener`.
- **Triage labels**: read `docs/agents/triage-labels.md` before you label an issue.
- **Domain docs**: read `docs/agents/domain.md` before you name a domain concept or record an architecture decision.

# Kener — Agent Instructions

## Run

Use only `bun` for every command: `bun install`, `bun run <script>`, `bunx <tool>`, `bun <file>`. Never run `npm`, `npx`, `pnpm`, `yarn`, or `node`, and never create or commit `package-lock.json`. Write `bun run test`, not `bun test`: the bare form starts Bun's own test runner instead of the `test` script that runs Vitest.

The `migrate`, `preseed`, `seed`, and `predev` scripts call `bunx knex` and `bun run`. `build`, `build-with-docs`, and `start` still call `node` and `npx`, because the `Dockerfile` builds and runs them on Node with `npm run build`; keep them as they are, and still start them with `bun run`. Knex prints "Failed to load external module ts-node/register" and similar lines when it loads `knexfile.ts`: they are harmless, because Bun loads the TypeScript file itself.

Dev needs Redis on `REDIS_URL`: `cp .env-min.example .env`, then `docker compose -f docker-compose.dev.yml up -d redis`. `bun run dev` migrates and seeds the database before it starts. `bun run build` leaves out the docs site in `src/routes/(docs)/`; `bun run build-with-docs` keeps it.

## Finish a Change

1. Put a test next to new server logic (`apiCall.ts` and `apiCall.test.ts`). Name a component test `<component>.svelte.test.ts` so it runs in Chromium.
2. A change that reads, writes, or updates the database, or adds a migration or seed, must pass on SQLite, PostgreSQL, and MySQL. `bun run test` runs on SQLite only. Run the change on the other two as the Database section of `CODING_STANDARDS.md` shows.
3. When the change alters what a user sees or can do, update every text that describes the old behavior: the docs in `src/routes/(docs)/docs/content/v4/` and the help text in `.svelte` files. Search all of `src/routes` for the setting key and its UI label, for example `rg -i 'is_hidden|hidden in status page|hidden monitor' src/routes`.
4. Format only the files you changed: `bunx prettier --write <files>`. Some files elsewhere are not formatted yet.
5. Run `bun run check` and `bun run test` until both pass. Run a single test through the package scripts, which set `TZ=UTC`: `bun run test:server -- <file>`.

## Ask First

Ask the maintainer before you add a dependency (with `bun add`), change the database schema or the `/api/v4` request and response shapes, or edit `.github/workflows/`, `Dockerfile`, or `docker-compose*.yml`.

## Guides

- **Coding standards**: read `CODING_STANDARDS.md` before you write or review code that touches the database, a migration or seed, a timestamp, or an API route.
- **Skills**: read the matching `.claude/skills/<name>/SKILL.md` before you edit a `.svelte` or `.svelte.ts` file (`svelte-code-writer`), the docs site in `src/routes/(docs)/` (`documentation-writer`), Tailwind classes (`tailwindcss`), or `src/lib/components/ui/` (`ss-shadcn-svelte`).
- **Monitor types**: copy the closest existing type into each file where `rg -il <type> src` finds it. A type with no branch in `src/lib/server/services/service.ts` falls through to `NoneCall`: it runs no checks, reports no error, and passes `bun run check`.
- **Locales**: the app loads every `src/lib/locales/{code}.json` with no registration. `bun scripts/check-translations.js` writes each locale's missing and unused keys to `translation-report.json`.
- **Environment variables**: `src/routes/(docs)/docs/content/v4/setup/environment-variables.md` documents each one. Add a new one there.
- **Issues**: read `docs/agents/issue-tracker.md` before you create, read, or update a GitHub issue in `rajnandan1/kener`, and `docs/agents/triage-labels.md` before you label one.
- **Domain docs**: read `docs/agents/domain.md` before you name a domain concept or record an architecture decision.

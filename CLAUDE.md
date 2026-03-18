# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Kener?

Kener is an open-source status page application built with **SvelteKit 2.x (Svelte 5)** and **Node.js/Express**. It is a **TypeScript-first** codebase providing real-time monitoring, uptime tracking, incident management, and customizable dashboards.

## Development Commands

```bash
npm run dev          # Start dev server (SvelteKit + cron scheduler in parallel)
npm run build        # Production build (SvelteKit then esbuild server bundle)
npm run start        # Run production build (node build/main.js)
npm run check        # Svelte + TypeScript type checking
npm run prettify     # Format all files with Prettier
npm run migrate      # Run database migrations via Knex
npm run seed         # Run database seeds (migrations run automatically first)
```

## Architecture

### Dual Process Model

In development, `npm run dev` runs two parallel processes:

1. **SvelteKit dev server** (`vite dev`) - serves the frontend
2. **Cron scheduler** (`vite-node src/lib/server/startup.ts`) - runs monitor checks, maintenance scheduler, daily cleanup

In production, `scripts/main.ts` is the single entry point: Express server + SvelteKit handler + migrations + seeds + scheduler startup.

### SvelteKit Route Groups

- **`(kener)/`** - Public status page
- **`(manage)/`** - Admin dashboard (authenticated)
- **`(embed)/`** - Embeddable widgets
- **`(docs)/`** - Documentation pages
- **`(api)/`** - SvelteKit API routes; also `src/lib/server/api-server/` for Express-side API handlers (file-based routing: `./action/method.ts`)
- **`(account)/`** - Account/auth pages
- **`(ext)/`** - External integrations
- **`(assets)/`** - Asset serving

### Database

- **Knex.js** for query building and migrations. Supports SQLite (default), PostgreSQL, MySQL
- Connection configured via `DATABASE_URL` env var: `sqlite://./path`, `postgresql://...`, `mysql://...`
- Migrations in `/migrations/`, seeds in `/seeds/`
- Always use the db singleton: `import db from "$lib/server/db/db"`

### Monitor Services

Each monitor type has a dedicated implementation in `src/lib/server/services/`:

- Types: API, Ping, TCP, DNS, SSL, SQL, Heartbeat, GameDig, Group, gRPC, None
- Scheduled via `src/lib/server/schedulers/` using `croner`
- Job queues managed with **BullMQ** + **Redis** (`src/lib/server/queues/`)

### Build System

`npm run build` is a two-step process:

1. `scripts/build-sveltekit.js` - Vite build of SvelteKit app (optionally with `--with-docs`)
2. `scripts/build-server.js` - esbuild bundles `scripts/main.ts` into `build/main.js`

## Key Conventions

### Svelte 5 + TypeScript

- Use **TypeScript** for new/modified code
- Use **Svelte 5 runes** (`$state`, `$derived`, `$effect`, `$props()`) in new components
- Use generated `$types` for SvelteKit route typing (`import type { PageServerLoad } from './$types'`)
- Use `import type { ... }` for type imports

### UI Components

- **shadcn-svelte** components in `src/lib/components/ui/`
- Import: `import { Button } from "$lib/components/ui/button"`
- Styling: **Tailwind CSS v4** with HSL CSS variables for theming

### Timestamps

All timestamps are **UTC seconds** (not milliseconds). Use helpers from `src/lib/server/tool.ts`.

### Status Constants

Constants are exported as a **default export** from `src/lib/global-constants.ts`:

```typescript
// In Svelte/client code or SvelteKit routes:
import GC from "$lib/global-constants";
// Usage: GC.UP, GC.DOWN, GC.DEGRADED, GC.MAINTENANCE, GC.NO_DATA

// In server code (use relative path):
import GC from "../../global-constants.js";
// Usage: GC.UP, GC.DOWN, etc.
```

### API Authentication

APIs use Bearer token auth: `import { VerifyAPIKey } from "$lib/server/controllers/apiController"`

### Types Location

- `src/lib/types/` - Shared types (client + server)
- `src/lib/server/types/` - Server-only types
- `src/lib/client/types/` - Client-only types

### i18n

Locale files in `src/lib/locales/`. Add translations by creating `{code}.json` and updating `locales.json`.

## Environment Variables

Required: `KENER_SECRET_KEY`, `ORIGIN`, `REDIS_URL`
Optional: `DATABASE_URL` (defaults to SQLite), `KENER_BASE_PATH`, `PORT` (default 3000), `RESEND_API_KEY`, `RESEND_SENDER_EMAIL`

## Skills

Read `.claude/skills/` for specialized instructions on:

- **svelte-code-writer** - Svelte component creation/editing
- **documentation-writer** - Editing docs in `src/routes/(docs)/docs/content/`
- **tailwindcss** - Tailwind CSS v4 patterns

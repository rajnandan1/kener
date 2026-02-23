# Kener - AI Coding Instructions

## Project Overview

Kener is an open-source status page application built with **SvelteKit 2.x** (**Svelte 5**) and **Node.js**, and is migrating to a **TypeScript-first** codebase. It provides real-time monitoring, uptime tracking, incident management, and customizable dashboards.

## Architecture

### Entry Points
- **`main.js`** - Production server entry: Express + SvelteKit handler + cron scheduler
- **`src/lib/server/startup.js`** - Cron job scheduler for monitors (runs every minute)

### Route Groups (SvelteKit)
- **`(kener)/`** - Public status page routes
- **`(manage)/`** - Admin dashboard (requires authentication)
- **`(embed)/`** - Embeddable widgets
- **`(docs)/`** - Documentation pages

### Core Server Components
- **`src/lib/server/controllers/controller.js`** - Main business logic (~1700 lines), handles monitors, incidents, auth, email
- **`src/lib/server/db/dbimpl.js`** - Database abstraction layer using Knex.js
- **`src/lib/server/services/`** - Monitor type implementations: API, Ping, TCP, DNS, SSL, SQL, Heartbeat, GameDig, Group
- **`src/lib/server/cron-minute.js`** - Per-monitor cron execution logic

### Database
- Supports SQLite (default), PostgreSQL, MySQL via **Knex.js**
- Connection string format: `sqlite://./path` or `postgresql://...` or `mysql://...`
- Migrations in `/migrations/`, seeds in `/seeds/`
- Run migrations: `npm run migrate` or auto-runs on `npm start`

## Development Commands

```bash
npm run dev        # Start dev server with hot reload + cron scheduler
npm run build      # Production build
npm run preview    # Preview production build
npm run check      # Typecheck + Svelte checks (uses tsconfig)
```

## Key Patterns

### Svelte 5 + TypeScript conventions
- Prefer **TypeScript** for new/modified code (`.ts`, and `.svelte` with `lang="ts"`).
- Prefer **Svelte 5 runes** for component state/effects in new code (e.g. `$state`, `$derived`, `$effect`).
- Prefer Svelte 5 props via `$props()` in new components. Keep existing `export let` props where already used to avoid churn.
- For SvelteKit route typing, prefer generated `$types` (e.g. `import type { PageServerLoad } from './$types'`).
- Avoid packages that hard-require Svelte 4 (they can break or force `--legacy-peer-deps`).

### Monitor Types
Defined in `src/lib/server/services/service.js`. Each type has its own implementation file:
```javascript
// Supported: API, PING, TCP, DNS, GROUP, SSL, SQL, HEARTBEAT, GAMEDIG
```

### Status Constants
Use constants from `src/lib/server/constants`:
```javascript
import { UP, DOWN, DEGRADED, MAINTENANCE, NO_DATA } from "./constants";
```

### API Authentication
APIs use Bearer token auth verified via `VerifyAPIKey()`:
```javascript
import { VerifyAPIKey } from "$lib/server/controllers/controller.js";
```

### Database Queries
Always use the db singleton, never instantiate Knex directly:
```javascript
import db from "$lib/server/db/db";
const monitor = await db.getMonitorByTag(tag);
```

### Timestamps
All timestamps are **UTC seconds** (not milliseconds). Use helpers from `src/lib/server/tool.js`:
```javascript
import { GetMinuteStartNowTimestampUTC, GetNowTimestampUTC } from "./tool";
```

### i18n
Locales are in `src/lib/locales/`. Add new translations by creating `{code}.json` and updating `locales.json`.

## UI Components

Uses **shadcn-svelte** components in `src/lib/components/ui/`. Import pattern:
```javascript
import { Button } from "$lib/components/ui/button";
```

Styling: **TailwindCSS** with HSL CSS variables for theming (see `tailwind.config.js`).

## Environment Variables

Required in `.env`:
- `KENER_SECRET_KEY` - JWT secret for auth
- `ORIGIN` - Site URL (e.g., `http://localhost:3000`)
- `DATABASE_URL` - Database connection string

Optional:
- `KENER_BASE_PATH` - Base path for reverse proxy
- `RESEND_API_KEY` / `RESEND_SENDER_EMAIL` - Email notifications

## File Conventions

- Server-only code: `src/lib/server/`
- Shared utilities: `src/lib/` (except `server/`)
- Route data loading: `+page.server.ts` / `+layout.server.ts` (and client-side `+page.ts` / `+layout.ts` when needed)
- API endpoints: `+server.ts` files returning `json()`

## Types & Interfaces

Place types and interfaces in the appropriate folder based on where they are used:

- **`src/lib/types/`** - Shared types (safe to import from both server and client code). Use for domain models, DTOs, API response types, and anything needed on both sides.
- **`src/lib/server/types/`** - Server-only types. Use for DB models, internal service types, auth/session types, and anything that uses `$env/static/private` or Node-only APIs.
- **`src/lib/client/types/`** - Client-only types. Use for UI-specific types, component prop types, and anything that relies on browser/DOM APIs.

Always use `import type { ... }` when importing types to avoid accidental runtime imports.

# Other skills

Read files in .claude/skills for more instructions on specific tasks or file types.
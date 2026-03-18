# Kener - AI Coding Instructions

## Project Overview

Kener is an open-source status page application built with **SvelteKit 2.x** (**Svelte 5**) and **Node.js/Express**. It is a **TypeScript-first** codebase providing real-time monitoring, uptime tracking, incident management, and customizable dashboards.

## Architecture

### Dual Process Model

In development, `npm run dev` runs two parallel processes:
1. **SvelteKit dev server** (`vite dev`) - serves the frontend with HMR
2. **Cron scheduler** (`vite-node src/lib/server/startup.ts`) - runs monitor checks, maintenance scheduling, daily cleanup

In production, **`scripts/main.ts`** is the single entry point: Express server + SvelteKit handler + migrations + seeds + scheduler startup. Built output runs via `node build/main.js`.

### Route Groups (SvelteKit)
- **`(kener)/`** - Public status page routes
- **`(manage)/`** - Admin dashboard (requires authentication)
- **`(embed)/`** - Embeddable widgets
- **`(docs)/`** - Documentation pages
- **`(api)/`** - SvelteKit API routes
- **`(account)/`** - Account/auth pages
- **`(ext)/`** - External integrations
- **`(assets)/`** - Asset serving

### Core Server Components
- **`src/lib/server/controllers/`** - Domain-split controllers (18 TypeScript files): `apiController.ts`, `incidentController.ts`, `monitorsController.ts`, `maintenanceController.ts`, `pagesController.ts`, `userController.ts`, `dashboardController.ts`, `emailController.ts`, `siteDataController.ts`, `validators.ts`, etc.
- **`src/lib/server/db/dbimpl.ts`** - Database abstraction layer using Knex.js with repository composition pattern
- **`src/lib/server/db/repositories/`** - Domain-driven repositories: `monitors.ts`, `incidents.ts`, `maintenances.ts`, `pages.ts`, `users.ts`, `alerts.ts`, `monitoring.ts`, `images.ts`, `subscriptionSystem.ts`, `emailTemplateConfig.ts`, `monitorAlertConfig.ts`, `site-data.ts`
- **`src/lib/server/services/`** - Monitor type implementations (all TypeScript): `apiCall.ts`, `pingCall.ts`, `tcpCall.ts`, `dnsCall.ts`, `sslCall.ts`, `sqlCall.ts`, `heartbeatCall.ts`, `gamedigCall.ts`, `groupCall.ts`, `grpcCall.ts`, `noneCall.ts`
- **`src/lib/server/schedulers/`** - Scheduling via `croner`: `appScheduler.ts`, `monitorSchedulers.ts`, `maintenanceScheduler.ts`, `dailyCleanup.ts`, `shutdown.ts`
- **`src/lib/server/queues/`** - Job queues via **BullMQ** + **Redis**: `monitorExecuteQueue.ts`, `monitorResponseQueue.ts`, `alertingQueue.ts`, `emailQueue.ts`, `subscriberQueue.ts`
- **`src/lib/server/api-server/`** - Express-side API handlers with file-based routing (directory/method pattern: e.g., `monitor-bar/get.ts`)
- **`src/lib/server/cron-minute.ts`** - Per-monitor cron execution logic

### Database
- Supports SQLite (default), PostgreSQL, MySQL via **Knex.js**
- Connection string format: `sqlite://./path` or `postgresql://...` or `mysql://...`
- Migrations in `/migrations/`, seeds in `/seeds/`
- Run migrations: `npm run migrate` or auto-runs on `npm start`

### Build System
`npm run build` is a two-step process:
1. `scripts/build-sveltekit.js` - Vite build of SvelteKit app (optionally with `--with-docs`)
2. `scripts/build-server.js` - esbuild bundles `scripts/main.ts` into `build/main.js`

## Development Commands

```bash
npm run dev          # Start dev server (SvelteKit + cron scheduler in parallel)
npm run build        # Production build (SvelteKit then esbuild server bundle)
npm run start        # Run production build (node build/main.js)
npm run check        # Svelte + TypeScript type checking
npm run prettify     # Format all files with Prettier
npm run migrate      # Run database migrations via Knex
npm run seed         # Run database seeds
```

## Key Patterns

### Svelte 5 + TypeScript conventions
- Use **TypeScript** for all code (`.ts`, and `.svelte` with `lang="ts"`).
- Use **Svelte 5 runes** (`$state`, `$derived`, `$effect`, `$props()`) in components.
- For SvelteKit route typing, use generated `$types` (e.g. `import type { PageServerLoad } from './$types'`).
- Avoid packages that hard-require Svelte 4.

### Monitor Types
Defined in `src/lib/server/services/service.ts`. Each type has its own implementation file:
```typescript
// Supported: API, PING, TCP, DNS, GROUP, SSL, SQL, HEARTBEAT, GAMEDIG, GRPC, NONE
```

### Status Constants
Use constants from `src/lib/global-constants.ts`:
```typescript
// In Svelte/client code:
import { UP, DOWN, DEGRADED, MAINTENANCE, NO_DATA } from "$lib/global-constants";

// In server code (use relative path):
import { UP, DOWN, DEGRADED, MAINTENANCE, NO_DATA } from "./global-constants";
```

### API Authentication
APIs use Bearer token auth verified via `VerifyAPIKey()`:
```typescript
import { VerifyAPIKey } from "$lib/server/controllers/apiController";
```

### Database Queries
Always use the db singleton, never instantiate Knex directly:
```typescript
import db from "$lib/server/db/db";
const monitor = await db.getMonitorByTag(tag);
```

### Timestamps
All timestamps are **UTC seconds** (not milliseconds). Use helpers from `src/lib/server/tool.ts`:
```typescript
import { GetMinuteStartTimestampUTC, GetNowTimestampUTC } from "$lib/server/tool";
```

### i18n
21 locale files in `src/lib/locales/` (en, de, fr, es, hi, ja, ko, zh-CN, zh-TW, pt-BR, ru, etc.). Add new translations by creating `{code}.json` and updating `locales.json`.

## UI Components

Uses **shadcn-svelte** components in `src/lib/components/ui/` (40+ components). Import pattern:
```typescript
import { Button } from "$lib/components/ui/button";
```

Styling: **Tailwind CSS v4** with CSS-based configuration (no `tailwind.config.js`). Theme uses HSL CSS variables defined in `src/routes/layout.css`.

## Environment Variables

Required:
- `KENER_SECRET_KEY` - Secret key for auth
- `ORIGIN` - Site URL (e.g., `http://localhost:3000`)
- `REDIS_URL` - Redis connection string (required for BullMQ job queues)

Optional:
- `DATABASE_URL` - Database connection string (defaults to SQLite)
- `KENER_BASE_PATH` - Base path for reverse proxy
- `PORT` - Server port (default 3000)
- `RESEND_API_KEY` / `RESEND_SENDER_EMAIL` - Email notifications

## File Conventions

- Server-only code: `src/lib/server/`
- Shared utilities: `src/lib/` (except `server/`)
- Client utilities: `src/lib/client/`
- Route data loading: `+page.server.ts` / `+layout.server.ts`
- API endpoints: `+server.ts` files returning `json()`

## Types & Interfaces

Place types and interfaces in the appropriate folder based on where they are used:

- **`src/lib/types/`** - Shared types (safe to import from both server and client code). Use for domain models, DTOs, API response types, and anything needed on both sides.
- **`src/lib/server/types/`** - Server-only types (`db.ts`, `auth.ts`, `monitor.ts`, `api-server.ts`). Use for DB models, internal service types, auth/session types.
- **`src/lib/client/types/`** - Client-only types (`ui.ts`). Use for UI-specific types, component prop types.

Always use `import type { ... }` when importing types to avoid accidental runtime imports.

# Project Structure

## Processes

In dev, `npm run dev` runs two processes: the SvelteKit dev server (`vite dev`) and the scheduler (`vite-node src/lib/server/startup.ts`). The scheduler runs monitor checks, the maintenance scheduler, and daily cleanup.

In production, `scripts/main.ts` is the single entry point: Express, the SvelteKit handler, migrations, seeds, and the scheduler. `scripts/build-server.js` bundles it with esbuild into `build/main.js`.

## Folders

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

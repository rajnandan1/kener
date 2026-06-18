import { AsyncLocalStorage } from "node:async_hooks";
import type { Knex as KnexType } from "knex";

// Per-execution-context selection of the database connection pool.
//
// Kener runs SvelteKit requests, the cron scheduler, and the BullMQ workers in
// a single process, all sharing one Knex instance. A burst of background jobs
// could therefore exhaust the connection pool and time out user-facing page
// loads (KnexTimeoutError on acquire). To prevent that, background work runs
// against a dedicated worker pool: queues/q.ts wraps every job processor in
// runWithWorkerKnex(), and BaseRepository reads getWorkerKnex() so its queries
// route to that pool. Anything outside a job (requests, startup, migrations)
// has no store set and falls back to the web pool.
//
// See knexfile.ts for pool sizing and docs .../setup/database-setup.md.
const workerKnexStorage = new AsyncLocalStorage<KnexType>();

/** Runs `fn` with all repository queries routed to the worker pool `knex`. */
export function runWithWorkerKnex<T>(knex: KnexType, fn: () => Promise<T>): Promise<T> {
  return workerKnexStorage.run(knex, fn);
}

/** The worker pool for the current context, or undefined when not in a job. */
export function getWorkerKnex(): KnexType | undefined {
  return workerKnexStorage.getStore();
}

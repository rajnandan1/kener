import dotenv from "dotenv";
dotenv.config();

const databaseURL = process.env.DATABASE_URL || "sqlite://./database/kener.sqlite.db";

const databaseURLParts = databaseURL.split("://");
const databaseType = databaseURLParts[0];
const databasePath = databaseURLParts[1];

const intFromEnv = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

// TCP keepalive on pooled connections, on by default. Cloud networks (Railway,
// Docker Swarm overlays, k8s) silently drop idle TCP connections; without
// keepalive the pool keeps handing out dead sockets after an idle period or a
// database restart. See docs .../setup/database-setup.md.
const keepAliveEnabled = process.env.DATABASE_KEEPALIVE !== "false";

interface PoolConfig {
  min: number;
  max: number;
  idleTimeoutMillis: number;
  createTimeoutMillis: number;
}

// Two pools share one process (Postgres/MySQL only): the WEB pool serves
// SvelteKit requests; the WORKER pool serves background jobs (BullMQ workers +
// schedulers, routed via src/lib/server/db/poolContext.ts). Isolating them
// stops a burst of background jobs from exhausting the connections that serve
// page loads. Budget across both pools: replicas * (web + worker) must stay
// under the database's max_connections. SQLite has no real pool and reuses a
// single connection, so the split does not apply there.
//
// Pool defaults deviate from knex's on purpose:
// - min 0: knex's min 2 connections are never reaped, so they are exactly the
//   ones that go stale and wedge the app until a manual restart
// - 15s acquire/create timeouts: fail fast instead of hanging requests for
//   knex's default 60s during a database outage
// Tarn requires max >= 1 and min <= max; clamp so a bad env value can not
// produce a pool that fails every acquire
const idleTimeoutMillis = intFromEnv("DATABASE_IDLE_TIMEOUT_MS", 30000);
const createTimeoutMillis = intFromEnv("DATABASE_CREATE_TIMEOUT_MS", 15000);
const poolMin = intFromEnv("DATABASE_POOL_MIN", 0);
const buildPool = (max: number): PoolConfig => ({
  min: Math.min(poolMin, max),
  max,
  idleTimeoutMillis,
  createTimeoutMillis,
});
const webPool = buildPool(Math.max(1, intFromEnv("DATABASE_POOL_MAX", 10)));
const workerPool = buildPool(Math.max(1, intFromEnv("DATABASE_WORKER_POOL_MAX", 5)));
const acquireConnectionTimeout = intFromEnv("DATABASE_ACQUIRE_TIMEOUT_MS", 15000);

interface KnexConfig {
  migrations: { directory: string };
  seeds: { directory: string };
  databaseType: string;
  client?: string;
  connection?: string | { filename: string } | Record<string, unknown>;
  useNullAsDefault?: boolean;
  pool?: PoolConfig;
  acquireConnectionTimeout?: number;
}

const knexOb: KnexConfig = {
  migrations: {
    directory: "./migrations",
  },
  seeds: {
    directory: "./seeds",
  },
  databaseType,
};

// Worker pool config for Postgres/MySQL — same connection as the web config,
// but with the worker pool. Stays null for SQLite (single shared connection),
// in which case the app reuses the web instance for background work too.
let workerKnexOb: KnexConfig | null = null;

console.log(`Configuring database with type ${databaseType}`);
if (databaseType === "sqlite") {
  knexOb.client = "better-sqlite3";
  knexOb.connection = {
    filename: databasePath,
  };
  knexOb.useNullAsDefault = true;
} else if (databaseType === "postgresql") {
  knexOb.client = "pg";
  knexOb.connection = {
    connectionString: databaseURL,
    keepAlive: keepAliveEnabled,
  };
  knexOb.pool = webPool;
  knexOb.acquireConnectionTimeout = acquireConnectionTimeout;
  workerKnexOb = { ...knexOb, pool: workerPool };
} else if (databaseType === "mysql") {
  knexOb.client = "mysql2";
  knexOb.connection = {
    uri: databaseURL,
    enableKeepAlive: keepAliveEnabled,
    keepAliveInitialDelay: 10000,
  };
  knexOb.pool = webPool;
  knexOb.acquireConnectionTimeout = acquireConnectionTimeout;
  workerKnexOb = { ...knexOb, pool: workerPool };
} else {
  console.error("Invalid database type");
  process.exit(1);
}

export { workerKnexOb };
export default knexOb;

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
// database restart. See docs/adr/0003-fail-fast-self-healing-db-pool.md.
const keepAliveEnabled = process.env.DATABASE_KEEPALIVE !== "false";

// Pool defaults deviate from knex's on purpose:
// - min 0: knex's min 2 connections are never reaped, so they are exactly the
//   ones that go stale and wedge the app until a manual restart
// - 15s acquire/create timeouts: fail fast instead of hanging requests for
//   knex's default 60s during a database outage
const pool = {
  min: intFromEnv("DATABASE_POOL_MIN", 0),
  max: intFromEnv("DATABASE_POOL_MAX", 10),
  idleTimeoutMillis: intFromEnv("DATABASE_IDLE_TIMEOUT_MS", 30000),
  createTimeoutMillis: intFromEnv("DATABASE_CREATE_TIMEOUT_MS", 15000),
};
const acquireConnectionTimeout = intFromEnv("DATABASE_ACQUIRE_TIMEOUT_MS", 15000);

interface KnexConfig {
  migrations: { directory: string };
  seeds: { directory: string };
  databaseType: string;
  client?: string;
  connection?: string | { filename: string } | Record<string, unknown>;
  useNullAsDefault?: boolean;
  pool?: typeof pool;
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
  knexOb.pool = pool;
  knexOb.acquireConnectionTimeout = acquireConnectionTimeout;
} else if (databaseType === "mysql") {
  knexOb.client = "mysql2";
  knexOb.connection = {
    uri: databaseURL,
    enableKeepAlive: keepAliveEnabled,
    keepAliveInitialDelay: 10000,
  };
  knexOb.pool = pool;
  knexOb.acquireConnectionTimeout = acquireConnectionTimeout;
} else {
  console.error("Invalid database type");
  process.exit(1);
}

export default knexOb;

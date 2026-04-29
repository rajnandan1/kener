import Knex, { type Knex as KnexType } from "knex";
import GC from "../../global-constants.js";
import { GetRequiredSecrets, ReplaceAllOccurrences } from "../tool.js";
import { performance } from "node:perf_hooks";
import type { SqlMonitor, MonitoringResult } from "../types/monitor.js";

/**
 * Parse an ADO/SQL Server style connection string
 * (e.g. "Server=host,1433;Database=db;User Id=u;Password=p;TrustServerCertificate=true")
 * into a Knex/tedious-compatible config object.
 */
function parseMssqlConnectionString(connStr: string): Record<string, unknown> {
  const parts = connStr
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);

  const kv: Record<string, string> = {};
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim();
    kv[key] = value;
  }

  // Server / Data Source — may include ",port" or ":port" or "\\instance"
  const rawServer = kv["server"] ?? kv["data source"] ?? kv["address"] ?? kv["addr"] ?? kv["network address"];
  let server = rawServer ?? "";
  let port: number | undefined;
  let instanceName: string | undefined;

  if (server.includes(",")) {
    const [host, p] = server.split(",", 2);
    server = host.trim();
    const parsed = parseInt(p.trim(), 10);
    if (!Number.isNaN(parsed)) port = parsed;
  } else if (/:\d+$/.test(server)) {
    const [host, p] = server.split(":");
    server = host.trim();
    const parsed = parseInt(p.trim(), 10);
    if (!Number.isNaN(parsed)) port = parsed;
  }
  if (server.includes("\\")) {
    const [host, inst] = server.split("\\", 2);
    server = host.trim();
    instanceName = inst.trim();
  }

  if (kv["port"]) {
    const parsed = parseInt(kv["port"], 10);
    if (!Number.isNaN(parsed)) port = parsed;
  }

  const user = kv["user id"] ?? kv["uid"] ?? kv["user"] ?? kv["username"];
  const password = kv["password"] ?? kv["pwd"];
  const database = kv["database"] ?? kv["initial catalog"];

  const truthy = (v: string | undefined) => v !== undefined && /^(true|yes|1)$/i.test(v);

  const encrypt = kv["encrypt"] !== undefined ? truthy(kv["encrypt"]) : true;
  const trustServerCertificate = truthy(kv["trustservercertificate"]);

  const config: Record<string, unknown> = {
    server,
    options: {
      encrypt,
      trustServerCertificate,
      ...(port !== undefined ? { port } : {}),
      ...(instanceName ? { instanceName } : {}),
      ...(database ? { database } : {}),
    },
  };

  if (user !== undefined) {
    config.authentication = {
      type: "default",
      options: {
        userName: user,
        password: password ?? "",
      },
    };
    // Some Knex versions also read top-level user/password
    config.user = user;
    if (password !== undefined) config.password = password;
  }

  if (database) config.database = database;

  return config;
}

/**
 * Parse an mssql:// or sqlserver:// URL into a Knex/tedious-compatible config.
 * Ensures the port is a number (tedious requires it).
 */
function parseMssqlUrl(urlStr: string): Record<string, unknown> {
  const url = new URL(urlStr);
  const server = decodeURIComponent(url.hostname);
  const port = url.port ? parseInt(url.port, 10) : undefined;
  const user = url.username ? decodeURIComponent(url.username) : undefined;
  const password = url.password ? decodeURIComponent(url.password) : undefined;
  const database = url.pathname && url.pathname.length > 1 ? decodeURIComponent(url.pathname.slice(1)) : undefined;

  const truthy = (v: string | null) => v !== null && /^(true|yes|1)$/i.test(v);
  const params = url.searchParams;
  const encryptParam = params.get("encrypt");
  const encrypt = encryptParam !== null ? truthy(encryptParam) : true;
  const trustServerCertificate = truthy(params.get("trustservercertificate") ?? params.get("trustServerCertificate"));

  const config: Record<string, unknown> = {
    server,
    options: {
      encrypt,
      trustServerCertificate,
      ...(port !== undefined && !Number.isNaN(port) ? { port } : {}),
      ...(database ? { database } : {}),
    },
  };

  if (user !== undefined) {
    config.authentication = {
      type: "default",
      options: {
        userName: user,
        password: password ?? "",
      },
    };
    config.user = user;
    if (password !== undefined) config.password = password;
  }
  if (database) config.database = database;

  return config;
}

class SqlCall {
  monitor: SqlMonitor;
  envSecrets: Array<{ find: string; replace: string | undefined }>;

  constructor(monitor: SqlMonitor) {
    this.monitor = monitor;
    this.envSecrets = GetRequiredSecrets(`${monitor.type_data.connectionString}`);
  }

  async execute(): Promise<MonitoringResult> {
    let client = this.monitor.type_data.dbType;
    let connection = this.monitor.type_data.connectionString;
    for (let i = 0; i < this.envSecrets.length; i++) {
      const secret = this.envSecrets[i];
      if (secret.replace !== undefined) {
        connection = ReplaceAllOccurrences(connection, secret.find, secret.replace);
      }
    }
    let query = this.monitor.type_data.query;
    let timeout = this.monitor.type_data.timeout || 5000;

    const startTime = performance.now();
    let knexInstance: KnexType | null = null;

    try {
      // For SQL Server, parse connection strings into a config object
      // because Knex/tedious does not parse ADO strings, and URL parsing
      // leaves the port as a string (tedious requires a number).
      let connectionConfig: unknown = connection;
      if (client === "mssql" && typeof connection === "string") {
        if (/^mssql:\/\//i.test(connection) || /^sqlserver:\/\//i.test(connection)) {
          connectionConfig = parseMssqlUrl(connection);
        } else if (/(?:^|;)\s*server\s*=/i.test(connection)) {
          connectionConfig = parseMssqlConnectionString(connection);
        }
      }

      // Create database configuration
      const config = {
        client: client,
        connection: connectionConfig,
        pool: { min: 0, max: 1 },
        acquireConnectionTimeout: timeout,
      };

      // Initialize knex
      knexInstance = Knex(config);

      // Set up a timeout for the query execution
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Query timeout")), timeout);
      });

      // Execute query
      const queryPromise = knexInstance.raw(query);

      // Race the promises to handle timeouts
      await Promise.race([queryPromise, timeoutPromise]);

      // Calculate latency
      const latency = Math.round(performance.now() - startTime);

      return {
        status: GC.UP,
        latency: latency,
        type: GC.REALTIME,
      };
    } catch (error: unknown) {
      let errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.length > 200) {
        errorMessage = errorMessage.substring(0, 200) + "...";
      }
      console.log(`Error executing SQL query for monitor with tag ${this.monitor.tag}:`, errorMessage);
      const latency = Math.round(performance.now() - startTime);

      // Handle timeout specifically
      if (error instanceof Error && error.message === "Query timeout") {
        return {
          status: GC.DOWN,
          latency: latency,
          type: GC.TIMEOUT,
          error_message: "Query execution exceeded timeout of " + timeout + "ms",
        };
      }

      // Handle other connection or query errors
      return {
        status: GC.DOWN,
        latency: latency,
        type: GC.ERROR,
        error_message: errorMessage,
      };
    } finally {
      // Destroy knex instance to clean up connections
      if (knexInstance) {
        try {
          await knexInstance.destroy();
        } catch (destroyError) {
          console.error("Error closing database connection:", destroyError);
        }
      }
    }
  }
}

export default SqlCall;

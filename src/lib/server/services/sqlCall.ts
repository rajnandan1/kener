import Knex, { type Knex as KnexType } from "knex";
import { UP, DOWN, DEGRADED, REALTIME, TIMEOUT, ERROR, MANUAL } from "../constants.js";
import { GetRequiredSecrets, ReplaceAllOccurrences } from "../tool.js";
import type { SqlMonitor, MonitoringResult } from "../types/monitor.js";

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

    const startTime = Date.now();
    let knexInstance: KnexType | null = null;

    try {
      // Create database configuration
      const config = {
        client: client,
        connection: connection,
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
      const latency = Date.now() - startTime;

      return {
        status: UP,
        latency: latency,
        type: REALTIME,
      };
    } catch (error: unknown) {
      const latency = Date.now() - startTime;

      // Handle timeout specifically
      if (error instanceof Error && error.message === "Query timeout") {
        return {
          status: DOWN,
          latency: latency,
          type: TIMEOUT,
        };
      }

      // Handle other connection or query errors
      return {
        status: DOWN,
        latency: latency,
        type: ERROR,
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

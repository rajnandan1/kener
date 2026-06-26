import type { Knex as KnexType } from "knex";
import { getWorkerKnex } from "../poolContext.js";

// Filter types for queries
export interface MonitorFilter {
  status?: string;
  category_name?: string;
  id?: number;
  monitor_type?: string;
  tag?: string;
  is_hidden?: string;
  tags?: string[];
  search?: string;
}

export interface TriggerFilter {
  status?: string;
  id?: number;
}

export interface IncidentFilter {
  status?: string;
  start?: number;
  end?: number;
  state?: string;
  id?: number;
  incident_type?: string;
  incident_source?: string;
}

export interface CountResult {
  count: string | number;
}

/**
 * Base repository class that provides access to the Knex instance
 */
export abstract class BaseRepository {
  private readonly fallbackKnex: KnexType;

  constructor(knex: KnexType) {
    this.fallbackKnex = knex;
  }

  /**
   * The Knex instance for the current execution context.
   *
   * Background jobs run inside a worker-pool context (set in queues/q.ts), so
   * their queries use the dedicated worker connection pool. Everything else —
   * SvelteKit requests, startup — falls back to the web pool this repository
   * was constructed with. This keeps a burst of background jobs from exhausting
   * the connections that serve page loads. See poolContext.ts and knexfile.ts.
   */
  protected get knex(): KnexType {
    return getWorkerKnex() ?? this.fallbackKnex;
  }
}

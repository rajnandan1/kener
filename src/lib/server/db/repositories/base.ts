import type { Knex as KnexType } from "knex";

// Filter types for queries
export interface MonitorFilter {
  status?: string;
  category_name?: string;
  id?: number;
  monitor_type?: string;
  tag?: string;
  is_hidden?: string;
  tags?: string[];
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
  protected knex: KnexType;

  constructor(knex: KnexType) {
    this.knex = knex;
  }
}

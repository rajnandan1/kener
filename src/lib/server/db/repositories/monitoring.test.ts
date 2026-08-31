import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Knex from "knex";
import type { Knex as KnexType } from "knex";
import { MonitoringRepository } from "./monitoring.js";

// Repository-level check against in-memory SQLite: getLatestMonitoringDataAllActive
// must return exactly the newest row per requested tag, regardless of insert order.
describe("MonitoringRepository.getLatestMonitoringDataAllActive", () => {
  let db: KnexType;
  let repo: MonitoringRepository;

  beforeAll(async () => {
    db = Knex({
      client: "better-sqlite3",
      connection: { filename: ":memory:" },
      useNullAsDefault: true,
    });
    await db.schema.createTable("monitoring_data", (table) => {
      table.string("monitor_tag").notNullable();
      table.integer("timestamp").notNullable();
      table.string("status");
      table.float("latency");
      table.string("type");
      table.primary(["monitor_tag", "timestamp"]);
    });
    await db("monitoring_data").insert([
      { monitor_tag: "alpha", timestamp: 300, status: "UP", latency: 12, type: "REALTIME" },
      { monitor_tag: "alpha", timestamp: 100, status: "DOWN", latency: 40, type: "REALTIME" },
      { monitor_tag: "alpha", timestamp: 200, status: "DEGRADED", latency: 25, type: "REALTIME" },
      { monitor_tag: "beta", timestamp: 150, status: "UP", latency: 8, type: "REALTIME" },
      { monitor_tag: "ignored", timestamp: 999, status: "UP", latency: 1, type: "REALTIME" },
    ]);
    repo = new MonitoringRepository(db);
  });

  afterAll(async () => {
    await db.destroy();
  });

  it("returns the newest row per requested tag", async () => {
    const rows = await repo.getLatestMonitoringDataAllActive(["alpha", "beta"]);
    const byTag = Object.fromEntries(rows.map((r) => [r.monitor_tag, r]));
    expect(rows).toHaveLength(2);
    expect(byTag["alpha"]).toMatchObject({ timestamp: 300, status: "UP" });
    expect(byTag["beta"]).toMatchObject({ timestamp: 150, status: "UP" });
  });

  it("skips tags that have no data", async () => {
    const rows = await repo.getLatestMonitoringDataAllActive(["alpha", "missing"]);
    expect(rows).toHaveLength(1);
    expect(rows[0].monitor_tag).toBe("alpha");
  });

  it("returns [] for an empty tag list", async () => {
    expect(await repo.getLatestMonitoringDataAllActive([])).toEqual([]);
  });
});

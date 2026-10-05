import { afterAll, beforeAll, describe, expect, it } from "vitest";
import knex, { type Knex } from "knex";
import { MaintenancesRepository } from "./maintenances";

describe("MaintenancesRepository.getAllGlobalOngoingMaintenanceEvents", () => {
  const ts = 1000;
  let db: Knex;
  let repo: MaintenancesRepository;

  const summarize = (events: Awaited<ReturnType<MaintenancesRepository["getAllGlobalOngoingMaintenanceEvents"]>>) =>
    events.map((event) => ({ id: event.id, monitors: event.monitors.map((m) => m.monitor_tag) }));

  beforeAll(async () => {
    db = knex({
      client: "better-sqlite3",
      connection: { filename: ":memory:" },
      useNullAsDefault: true,
    });

    await db.schema.createTable("monitors", (table) => {
      table.string("tag").primary();
      table.string("name").notNullable();
      table.string("image");
      table.string("is_hidden").defaultTo("NO").notNullable();
    });
    await db.schema.createTable("maintenances", (table) => {
      table.integer("id").primary();
      table.string("title").notNullable();
      table.string("description");
      table.string("status").defaultTo("ACTIVE");
      table.string("is_global").defaultTo("NO");
    });
    await db.schema.createTable("maintenances_events", (table) => {
      table.integer("id").primary();
      table.integer("maintenance_id").notNullable();
      table.integer("start_date_time").notNullable();
      table.integer("end_date_time").notNullable();
      table.string("status").defaultTo("ONGOING");
      table.timestamps(true, true);
    });
    await db.schema.createTable("maintenance_monitors", (table) => {
      table.integer("maintenance_id").notNullable();
      table.string("monitor_tag").notNullable();
      table.string("monitor_impact");
    });

    await db("monitors").insert([
      { tag: "api", name: "Public API", is_hidden: "NO" },
      { tag: "billing-db", name: "Billing DB", is_hidden: "YES" },
    ]);
    await db("maintenances").insert([
      { id: 1, title: "Global, no monitors", is_global: "YES" },
      { id: 2, title: "Global, hidden monitor only", is_global: "YES" },
      { id: 3, title: "Global, visible and hidden monitors", is_global: "YES" },
      { id: 4, title: "Not global, hidden monitor only", is_global: "NO" },
      { id: 5, title: "Not global, visible monitor only", is_global: "NO" },
    ]);
    await db("maintenances_events").insert([
      { id: 11, maintenance_id: 1, start_date_time: 900, end_date_time: 2000 },
      { id: 12, maintenance_id: 2, start_date_time: 800, end_date_time: 2000 },
      { id: 13, maintenance_id: 3, start_date_time: 700, end_date_time: 2000 },
      { id: 14, maintenance_id: 4, start_date_time: 600, end_date_time: 2000 },
      { id: 15, maintenance_id: 5, start_date_time: 500, end_date_time: 2000 },
    ]);
    await db("maintenance_monitors").insert([
      { maintenance_id: 2, monitor_tag: "billing-db", monitor_impact: "MAINTENANCE" },
      { maintenance_id: 3, monitor_tag: "api", monitor_impact: "MAINTENANCE" },
      { maintenance_id: 3, monitor_tag: "billing-db", monitor_impact: "MAINTENANCE" },
      { maintenance_id: 4, monitor_tag: "billing-db", monitor_impact: "MAINTENANCE" },
      { maintenance_id: 5, monitor_tag: "api", monitor_impact: "MAINTENANCE" },
    ]);

    repo = new MaintenancesRepository(db);
  });

  afterAll(async () => {
    await db.destroy();
  });

  it("returns a global maintenance event that has no linked monitors", async () => {
    const events = summarize(await repo.getAllGlobalOngoingMaintenanceEvents(ts));
    expect(events).toContainEqual({ id: 11, monitors: [] });
  });

  it("keeps a global maintenance event linked only to hidden monitors, with an empty monitor list", async () => {
    const events = summarize(await repo.getAllGlobalOngoingMaintenanceEvents(ts));
    expect(events).toContainEqual({ id: 12, monitors: [] });
  });

  it("never lists a hidden monitor", async () => {
    expect(summarize(await repo.getAllGlobalOngoingMaintenanceEvents(ts))).toContainEqual({
      id: 13,
      monitors: ["api"],
    });
    expect(summarize(await repo.getAllGlobalOngoingMaintenanceEvents(ts, ["api", "billing-db"]))).toEqual([
      { id: 13, monitors: ["api"] },
      { id: 15, monitors: ["api"] },
    ]);
  });

  it("with a tags filter, returns only events linked to a requested monitor that is not hidden", async () => {
    expect(await repo.getAllGlobalOngoingMaintenanceEvents(ts, ["billing-db"])).toEqual([]);
    expect(summarize(await repo.getAllGlobalOngoingMaintenanceEvents(ts, ["api"]))).toEqual([
      { id: 13, monitors: ["api"] },
      { id: 15, monitors: ["api"] },
    ]);
  });
});

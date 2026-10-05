import { afterAll, beforeAll, describe, expect, it } from "vitest";
import knex, { type Knex } from "knex";
import { IncidentsRepository } from "./incidents";

describe("IncidentsRepository.getMonitorsByIncidentId", () => {
  let db: Knex;
  let repo: IncidentsRepository;

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
      table.string("description");
      table.string("is_hidden").defaultTo("NO").notNullable();
    });
    await db.schema.createTable("incident_monitors", (table) => {
      table.integer("incident_id").notNullable();
      table.string("monitor_tag").notNullable();
      table.string("monitor_impact");
    });

    await db("monitors").insert([
      { tag: "api", name: "Public API", is_hidden: "NO" },
      { tag: "billing-db", name: "Billing DB", is_hidden: "YES" },
    ]);
    await db("incident_monitors").insert([
      { incident_id: 1, monitor_tag: "api", monitor_impact: "DOWN" },
      { incident_id: 1, monitor_tag: "billing-db", monitor_impact: "DOWN" },
    ]);

    repo = new IncidentsRepository(db);
  });

  afterAll(async () => {
    await db.destroy();
  });

  it("leaves hidden monitors out of the public affected-monitor list", async () => {
    const monitors = await repo.getMonitorsByIncidentId(1);
    expect(monitors.map((m) => m.monitor_tag)).toEqual(["api"]);
  });
});

describe("IncidentsRepository.getAllGlobalOngoingIncidentsWithComments", () => {
  const ts = 1000;
  let db: Knex;
  let repo: IncidentsRepository;

  const summarize = (incidents: Awaited<ReturnType<IncidentsRepository["getAllGlobalOngoingIncidentsWithComments"]>>) =>
    incidents.map((incident) => ({ id: incident.id, monitors: incident.monitors.map((m) => m.monitor_tag) }));

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
    await db.schema.createTable("incidents", (table) => {
      table.integer("id").primary();
      table.string("title").notNullable();
      table.integer("start_date_time").notNullable();
      table.integer("end_date_time");
      table.string("status").defaultTo("OPEN");
      table.string("state").defaultTo("INVESTIGATING");
      table.string("incident_type").defaultTo("INCIDENT");
      table.string("is_global").defaultTo("NO");
      table.timestamps(true, true);
    });
    await db.schema.createTable("incident_monitors", (table) => {
      table.integer("incident_id").notNullable();
      table.string("monitor_tag").notNullable();
      table.string("monitor_impact");
    });
    await db.schema.createTable("incident_comments", (table) => {
      table.increments("id");
      table.integer("incident_id").notNullable();
      table.string("comment");
      table.integer("commented_at");
      table.string("status").defaultTo("ACTIVE");
    });

    await db("monitors").insert([
      { tag: "api", name: "Public API", is_hidden: "NO" },
      { tag: "billing-db", name: "Billing DB", is_hidden: "YES" },
    ]);
    await db("incidents").insert([
      { id: 1, title: "Global, no monitors", start_date_time: 900, is_global: "YES" },
      { id: 2, title: "Global, hidden monitor only", start_date_time: 800, is_global: "YES" },
      { id: 3, title: "Global, visible and hidden monitors", start_date_time: 700, is_global: "YES" },
      { id: 4, title: "Not global, hidden monitor only", start_date_time: 600, is_global: "NO" },
      { id: 5, title: "Not global, visible monitor only", start_date_time: 500, is_global: "NO" },
    ]);
    await db("incident_monitors").insert([
      { incident_id: 2, monitor_tag: "billing-db", monitor_impact: "DOWN" },
      { incident_id: 3, monitor_tag: "api", monitor_impact: "DOWN" },
      { incident_id: 3, monitor_tag: "billing-db", monitor_impact: "DOWN" },
      { incident_id: 4, monitor_tag: "billing-db", monitor_impact: "DOWN" },
      { incident_id: 5, monitor_tag: "api", monitor_impact: "DOWN" },
    ]);

    repo = new IncidentsRepository(db);
  });

  afterAll(async () => {
    await db.destroy();
  });

  it("returns a global incident that has no linked monitors", async () => {
    const incidents = summarize(await repo.getAllGlobalOngoingIncidentsWithComments(ts));
    expect(incidents).toContainEqual({ id: 1, monitors: [] });
  });

  it("keeps a global incident linked only to hidden monitors, with an empty monitor list", async () => {
    const incidents = summarize(await repo.getAllGlobalOngoingIncidentsWithComments(ts));
    expect(incidents).toContainEqual({ id: 2, monitors: [] });
  });

  it("never lists a hidden monitor", async () => {
    expect(summarize(await repo.getAllGlobalOngoingIncidentsWithComments(ts))).toContainEqual({
      id: 3,
      monitors: ["api"],
    });
    expect(summarize(await repo.getAllGlobalOngoingIncidentsWithComments(ts, ["api", "billing-db"]))).toEqual([
      { id: 3, monitors: ["api"] },
      { id: 5, monitors: ["api"] },
    ]);
  });

  it("with a tags filter, returns only incidents linked to a requested monitor that is not hidden", async () => {
    expect(await repo.getAllGlobalOngoingIncidentsWithComments(ts, ["billing-db"])).toEqual([]);
    expect(summarize(await repo.getAllGlobalOngoingIncidentsWithComments(ts, ["api"]))).toEqual([
      { id: 3, monitors: ["api"] },
      { id: 5, monitors: ["api"] },
    ]);
  });
});

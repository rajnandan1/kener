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

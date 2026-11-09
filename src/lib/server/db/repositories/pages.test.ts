import { afterAll, beforeAll, describe, expect, it } from "vitest";
import knex, { type Knex } from "knex";
import { PagesRepository } from "./pages";

describe("PagesRepository.replacePageMonitors", () => {
  let db: Knex;
  let repo: PagesRepository;

  beforeAll(async () => {
    db = knex({
      client: "better-sqlite3",
      connection: { filename: ":memory:" },
      useNullAsDefault: true,
    });
    await db.schema.createTable("pages_monitors", (table) => {
      table.integer("page_id").notNullable();
      table.string("monitor_tag").notNullable();
      table.text("monitor_settings_json");
      table.integer("position").notNullable().defaultTo(0);
      table.string("group_name");
      table.timestamp("created_at").defaultTo(db.fn.now());
      table.timestamp("updated_at").defaultTo(db.fn.now());
      table.primary(["page_id", "monitor_tag"]);
    });
    await db("pages_monitors").insert([
      { page_id: 1, monitor_tag: "api", position: 0, group_name: "Core" },
      { page_id: 1, monitor_tag: "db", position: 1, group_name: "Core" },
    ]);
    repo = new PagesRepository(db);
  });

  afterAll(async () => {
    await db.destroy();
  });

  it("keeps existing assignments when the replacement insert fails", async () => {
    await expect(
      repo.replacePageMonitors(1, [
        { page_id: 1, monitor_tag: "new", position: 0 },
        { page_id: 1, monitor_tag: "new", position: 1 },
      ]),
    ).rejects.toThrow();

    const rows = await repo.getPageMonitors(1);
    expect(rows.map(({ monitor_tag, group_name, position }) => ({ monitor_tag, group_name, position }))).toEqual([
      { monitor_tag: "api", group_name: "Core", position: 0 },
      { monitor_tag: "db", group_name: "Core", position: 1 },
    ]);
  });
});

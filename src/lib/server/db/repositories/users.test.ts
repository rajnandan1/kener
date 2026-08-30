import { afterAll, beforeAll, describe, expect, it } from "vitest";
import knex, { type Knex } from "knex";
import { UsersRepository } from "./users";

describe("UsersRepository.getUserByEmail", () => {
  let db: Knex;
  let repo: UsersRepository;

  beforeAll(async () => {
    db = knex({
      client: "better-sqlite3",
      connection: { filename: ":memory:" },
      useNullAsDefault: true,
    });

    await db.schema.createTable("users", (table) => {
      table.increments("id").primary();
      table.string("email", 255).notNullable().unique();
      table.string("name", 255).notNullable();
      table.string("password_hash", 255).notNullable();
      table.integer("is_active").defaultTo(1);
      table.integer("is_verified").defaultTo(0);
      table.string("is_owner").defaultTo("NO");
      table.timestamp("created_at").defaultTo(db.fn.now());
      table.timestamp("updated_at").defaultTo(db.fn.now());
    });
    await db.schema.createTable("roles", (table) => {
      table.string("id").primary();
      table.string("status").notNullable();
    });
    await db.schema.createTable("users_roles", (table) => {
      table.string("roles_id").notNullable();
      table.integer("users_id").notNullable();
    });
    await db("roles").insert({ id: "admin", status: "ACTIVE" });

    repo = new UsersRepository(db);

    // Signup stores emails lowercased. This is the address from issue #815.
    const inserted = await db("users").insert({
      email: "timothy.pace@yours.me.com",
      name: "Timothy Pace",
      password_hash: "hash",
    });
    await db("users_roles").insert({ roles_id: "admin", users_id: inserted[0] });
  });

  afterAll(async () => {
    await db.destroy();
  });

  it("does not match mixed-case input with a case-sensitive exact compare", async () => {
    const row = await db("users").where("email", "Timothy.Pace@yours.me.com").first();
    expect(row).toBeUndefined();
  });

  it("finds a user when the lookup email differs only by case", async () => {
    const user = await repo.getUserByEmail("Timothy.Pace@yours.me.com");
    expect(user).toBeDefined();
    expect(user?.email).toBe("timothy.pace@yours.me.com");
    expect(user?.role_ids).toEqual(["admin"]);
  });

  it("finds a user with an already-normalized email", async () => {
    const user = await repo.getUserByEmail("timothy.pace@yours.me.com");
    expect(user?.email).toBe("timothy.pace@yours.me.com");
  });

  it("trims surrounding whitespace before lookup", async () => {
    const user = await repo.getUserByEmail("  Timothy.Pace@yours.me.com  ");
    expect(user?.email).toBe("timothy.pace@yours.me.com");
  });

  it("returns undefined for a missing address", async () => {
    const user = await repo.getUserByEmail("nobody@example.com");
    expect(user).toBeUndefined();
  });

  it("does not treat email length as a constraint for valid addresses", async () => {
    const longLocal = `${"a".repeat(64)}@example.com`;
    await db("users").insert({
      email: longLocal,
      name: "Long Email",
      password_hash: "hash",
    });
    const user = await repo.getUserByEmail(longLocal.toUpperCase());
    expect(user?.email).toBe(longLocal);
  });
});

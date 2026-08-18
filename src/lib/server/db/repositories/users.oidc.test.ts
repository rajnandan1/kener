import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Knex } from "knex";
import { createMemoryDb, migrationSource } from "../testing/memory-db";
import { UsersRepository } from "./users";

let knex: Knex;
let repo: UsersRepository;

beforeEach(async () => {
  knex = await createMemoryDb();
  repo = new UsersRepository(knex);
  // admin/member/editor are already seeded by migration 20260331120000
  // (remove_role_from_users) once it drops the legacy users.role column, so
  // upsert here instead of a plain insert to avoid a UNIQUE violation on `id`.
  // knex also fills any key absent from a row with a literal NULL (not the
  // column's DEFAULT) when batch-inserting objects with heterogeneous keys —
  // verified across the better-sqlite3, pg and mysql2 dialects — so every row
  // sets `status` explicitly to avoid tripping the NOT NULL constraint.
  await knex("roles")
    .insert([
      { id: "admin", role_name: "Administrator", status: "ACTIVE" },
      { id: "member", role_name: "Member", status: "ACTIVE" },
      { id: "editor", role_name: "Editor", status: "ACTIVE" },
      { id: "retired", role_name: "Retired", status: "INACTIVE" },
    ])
    .onConflict("id")
    .merge();
});

afterEach(async () => {
  await knex.destroy();
});

describe("migration 20260818120000_add_oidc_support", () => {
  it("adds users.auth_provider (default local), users.oidc_sub and the mapping table", async () => {
    expect(await knex.schema.hasColumn("users", "auth_provider")).toBe(true);
    expect(await knex.schema.hasColumn("users", "oidc_sub")).toBe(true);
    expect(await knex.schema.hasTable("oidc_group_role_mappings")).toBe(true);
    const [id] = await repo.insertUser({ email: "a@example.com", name: "A", password_hash: "x", role_ids: ["member"] });
    const row = await knex("users").where({ id }).first();
    expect(row.auth_provider).toBe("local");
    expect(row.oidc_sub).toBeNull();
  });

  it("is reversible (down → up)", async () => {
    await knex.migrate.down({ migrationSource });
    expect(await knex.schema.hasColumn("users", "oidc_sub")).toBe(false);
    expect(await knex.schema.hasTable("oidc_group_role_mappings")).toBe(false);
    await knex.migrate.up({ migrationSource });
    expect(await knex.schema.hasColumn("users", "oidc_sub")).toBe(true);
  });
});

describe("insertUser", () => {
  it("keeps DB defaults when optional flags are omitted (existing callers)", async () => {
    const [id] = await repo.insertUser({
      email: "l@example.com",
      name: "Local",
      password_hash: "h",
      role_ids: ["admin"],
    });
    const row = await knex("users").where({ id }).first();
    expect(row.is_active).toBe(1);
    expect(row.is_verified).toBe(0);
    expect(row.auth_provider).toBe("local");
    expect(row.oidc_sub).toBeNull();
    expect(row.is_owner).toBe("NO");
  });

  it("forwards is_active, is_verified, auth_provider and oidc_sub when provided", async () => {
    const [id] = await repo.insertUser({
      email: "o@example.com",
      name: "OIDC",
      password_hash: "",
      role_ids: ["member"],
      is_active: 1,
      is_verified: 1,
      auth_provider: "oidc",
      oidc_sub: "sub-123",
    });
    const row = await knex("users").where({ id }).first();
    expect(row.is_verified).toBe(1);
    expect(row.auth_provider).toBe("oidc");
    expect(row.oidc_sub).toBe("sub-123");
    const [invited] = await repo.insertUser({
      email: "i@example.com",
      name: "Inv",
      password_hash: "",
      role_ids: [],
      is_active: 0,
    });
    expect((await knex("users").where({ id: invited }).first()).is_active).toBe(0);
  });

  it("rejects a second user with the same oidc_sub", async () => {
    await repo.insertUser({
      email: "x1@example.com",
      name: "X",
      password_hash: "",
      role_ids: [],
      auth_provider: "oidc",
      oidc_sub: "dup",
    });
    await expect(
      repo.insertUser({
        email: "x2@example.com",
        name: "X",
        password_hash: "",
        role_ids: [],
        auth_provider: "oidc",
        oidc_sub: "dup",
      }),
    ).rejects.toThrow(/UNIQUE/);
  });
});

describe("getUserByOidcSub / getUsersByRoleId / updateUserProfile", () => {
  it("finds a user by sub with role ids and the new columns", async () => {
    await repo.insertUser({
      email: "s@example.com",
      name: "S",
      password_hash: "",
      role_ids: ["member", "editor"],
      auth_provider: "oidc",
      oidc_sub: "sub-s",
    });
    const user = await repo.getUserByOidcSub("sub-s");
    expect(user?.email).toBe("s@example.com");
    expect(user?.auth_provider).toBe("oidc");
    expect(user?.oidc_sub).toBe("sub-s");
    expect([...(user?.role_ids ?? [])].sort()).toEqual(["editor", "member"]);
    expect(await repo.getUserByOidcSub("nope")).toBeUndefined();
  });

  it("getUsersByRoleId projects auth_provider and oidc_sub", async () => {
    await repo.insertUser({
      email: "r@example.com",
      name: "R",
      password_hash: "",
      role_ids: ["editor"],
      auth_provider: "oidc",
      oidc_sub: "sub-r",
    });
    const rows = await repo.getUsersByRoleId("editor");
    expect(rows).toHaveLength(1);
    expect(rows[0].auth_provider).toBe("oidc");
    expect(rows[0].oidc_sub).toBe("sub-r");
  });

  it("updateUserProfile updates only the given fields", async () => {
    const [id] = await repo.insertUser({ email: "p@example.com", name: "P", password_hash: "", role_ids: [] });
    await repo.updateUserProfile(id, { name: "P2" });
    let row = await knex("users").where({ id }).first();
    expect(row.name).toBe("P2");
    expect(row.email).toBe("p@example.com");
    await repo.updateUserProfile(id, { email: "p2@example.com" });
    row = await knex("users").where({ id }).first();
    expect(row.email).toBe("p2@example.com");
  });
});

describe("oidc group → role mappings", () => {
  it("upsert inserts, then updates in place for the same group", async () => {
    await repo.upsertOidcGroupRoleMapping({ oidc_group: "devs", role_id: "member" });
    await repo.upsertOidcGroupRoleMapping({ oidc_group: "devs", role_id: "editor" });
    const all = await repo.getAllOidcGroupRoleMappings();
    expect(all).toHaveLength(1);
    expect(all[0].oidc_group).toBe("devs");
    expect(all[0].role_id).toBe("editor");
    expect((await repo.getOidcGroupRoleMappingByGroup("devs"))?.role_id).toBe("editor");
  });

  it("delete returns the number of rows removed", async () => {
    await repo.upsertOidcGroupRoleMapping({ oidc_group: "ops", role_id: "admin" });
    const [{ id }] = await repo.getAllOidcGroupRoleMappings();
    expect(await repo.deleteOidcGroupRoleMapping(id)).toBe(1);
    expect(await repo.deleteOidcGroupRoleMapping(id)).toBe(0);
  });

  it("getOidcRoleIdsForGroups returns distinct active role ids only", async () => {
    await repo.upsertOidcGroupRoleMapping({ oidc_group: "g1", role_id: "member" });
    await repo.upsertOidcGroupRoleMapping({ oidc_group: "g2", role_id: "member" });
    await repo.upsertOidcGroupRoleMapping({ oidc_group: "g3", role_id: "retired" });
    expect(await repo.getOidcRoleIdsForGroups(["g1", "g2", "g3", "unknown"])).toEqual(["member"]);
    expect(await repo.getOidcRoleIdsForGroups([])).toEqual([]);
  });
});

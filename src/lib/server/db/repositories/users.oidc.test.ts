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
  it("adds users.auth_provider (default local), users.oidc_issuer + oidc_sub + oidc_role_ids and the mapping table", async () => {
    expect(await knex.schema.hasColumn("users", "auth_provider")).toBe(true);
    expect(await knex.schema.hasColumn("users", "oidc_issuer")).toBe(true);
    expect(await knex.schema.hasColumn("users", "oidc_sub")).toBe(true);
    expect(await knex.schema.hasColumn("users", "oidc_role_ids")).toBe(true);
    expect(await knex.schema.hasTable("oidc_group_role_mappings")).toBe(true);
    const [id] = await repo.insertUser({ email: "a@example.com", name: "A", password_hash: "x", role_ids: ["member"] });
    const row = await knex("users").where({ id }).first();
    expect(row.auth_provider).toBe("local");
    expect(row.oidc_issuer).toBeNull();
    expect(row.oidc_sub).toBeNull();
    expect(row.oidc_role_ids).toBeNull();
  });

  it("is reversible (down → up)", async () => {
    await knex.migrate.down({ migrationSource });
    expect(await knex.schema.hasColumn("users", "oidc_issuer")).toBe(false);
    expect(await knex.schema.hasColumn("users", "oidc_sub")).toBe(false);
    expect(await knex.schema.hasTable("oidc_group_role_mappings")).toBe(false);
    await knex.migrate.up({ migrationSource });
    expect(await knex.schema.hasColumn("users", "oidc_issuer")).toBe(true);
    expect(await knex.schema.hasColumn("users", "oidc_sub")).toBe(true);
    expect(await knex.schema.hasColumn("users", "oidc_role_ids")).toBe(true);
  });

  it("upgrades a database from an earlier build that keyed OIDC accounts by subject alone", async () => {
    // Roll back, recreate the old shape (oidc_sub with a single-column unique), migrate again.
    await knex.migrate.down({ migrationSource });
    await knex.schema.alterTable("users", (table) => {
      table.string("auth_provider", 20).notNullable().defaultTo("local");
      table.string("oidc_sub", 255).nullable().unique();
    });
    await knex.migrate.up({ migrationSource });
    expect(await knex.schema.hasColumn("users", "oidc_issuer")).toBe(true);
    expect(await knex.schema.hasColumn("users", "oidc_role_ids")).toBe(true);
    // The subject-only uniqueness is gone: the same sub may now exist under two issuers.
    const oidcUser = (issuer: string, email: string) =>
      repo.insertUser({
        email,
        name: "X",
        password_hash: "",
        role_ids: [],
        auth_provider: "oidc",
        oidc_issuer: issuer,
        oidc_sub: "same",
      });
    await oidcUser("https://a.example.com", "a1@example.com");
    await oidcUser("https://b.example.com", "b1@example.com");
    await expect(oidcUser("https://b.example.com", "b2@example.com")).rejects.toThrow(/UNIQUE/);
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

  it("forwards is_active, is_verified, auth_provider, oidc_issuer and oidc_sub when provided", async () => {
    const [id] = await repo.insertUser({
      email: "o@example.com",
      name: "OIDC",
      password_hash: "",
      role_ids: ["member"],
      is_active: 1,
      is_verified: 1,
      auth_provider: "oidc",
      oidc_issuer: "https://idp.example.com",
      oidc_sub: "sub-123",
    });
    const row = await knex("users").where({ id }).first();
    expect(row.is_verified).toBe(1);
    expect(row.auth_provider).toBe("oidc");
    expect(row.oidc_issuer).toBe("https://idp.example.com");
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

  it("rejects a second user with the same (issuer, sub) but allows the same sub under another issuer", async () => {
    const oidcUser = (issuer: string, email: string) =>
      repo.insertUser({
        email,
        name: "X",
        password_hash: "",
        role_ids: [],
        auth_provider: "oidc",
        oidc_issuer: issuer,
        oidc_sub: "dup",
      });
    await oidcUser("https://a.example.com", "x1@example.com");
    await expect(oidcUser("https://a.example.com", "x2@example.com")).rejects.toThrow(/UNIQUE/);
    // A subject is only unique within one provider (GitLab instances hand out sequential ids).
    await oidcUser("https://b.example.com", "x3@example.com");
  });
});

describe("updateUserRoles", () => {
  it("replaces the assignments atomically — a failing insert leaves the previous roles in place", async () => {
    const [id] = await repo.insertUser({ email: "t@example.com", name: "T", password_hash: "", role_ids: ["member"] });
    // (roles_id, users_id) is the primary key, so the duplicate makes the insert fail after the delete ran.
    await expect(repo.updateUserRoles(id, ["editor", "editor"])).rejects.toThrow();
    expect(await repo.getUserAssignedRoleIds(id)).toEqual(["member"]);
    await repo.updateUserRoles(id, ["editor", "admin"]);
    expect([...(await repo.getUserAssignedRoleIds(id))].sort()).toEqual(["admin", "editor"]);
  });
});

describe("OIDC role provenance (users.oidc_role_ids)", () => {
  const oidcInsert = (email: string, role_ids: string[], oidc_role_ids?: string[]) =>
    repo.insertUser({
      email,
      name: "P",
      password_hash: "",
      role_ids,
      oidc_role_ids,
      auth_provider: "oidc",
      oidc_issuer: "https://a.example.com",
      oidc_sub: email,
    });

  it("getUserOidcRoleIds is null until a sync recorded something; insertUser stores the granted set", async () => {
    const [local] = await repo.insertUser({
      email: "l@example.com",
      name: "L",
      password_hash: "h",
      role_ids: ["member"],
    });
    expect(await repo.getUserOidcRoleIds(local)).toBeNull();
    const [u] = await oidcInsert("p1@example.com", ["editor"], ["editor"]);
    expect(await repo.getUserOidcRoleIds(u)).toEqual(["editor"]);
    const [none] = await oidcInsert("p2@example.com", ["member"], []);
    expect(await repo.getUserOidcRoleIds(none)).toEqual([]);
  });

  it("getUserOidcRoleIds treats an unreadable value as unknown (null)", async () => {
    const [u] = await oidcInsert("p3@example.com", ["member"], ["member"]);
    await knex("users").where({ id: u }).update({ oidc_role_ids: "{not json" });
    expect(await repo.getUserOidcRoleIds(u)).toBeNull();
    await knex("users")
      .where({ id: u })
      .update({ oidc_role_ids: JSON.stringify({ nope: 1 }) });
    expect(await repo.getUserOidcRoleIds(u)).toBeNull();
  });

  it("updateUserOidcRoles replaces the roles and records the granted set atomically", async () => {
    const [u] = await oidcInsert("p4@example.com", ["member"], ["member"]);
    await repo.updateUserOidcRoles(u, { role_ids: ["editor", "admin"], oidc_role_ids: ["editor"] });
    expect([...(await repo.getUserAssignedRoleIds(u))].sort()).toEqual(["admin", "editor"]);
    expect(await repo.getUserOidcRoleIds(u)).toEqual(["editor"]);

    // Provenance-only update leaves the assignments alone.
    await repo.updateUserOidcRoles(u, { oidc_role_ids: [] });
    expect([...(await repo.getUserAssignedRoleIds(u))].sort()).toEqual(["admin", "editor"]);
    expect(await repo.getUserOidcRoleIds(u)).toEqual([]);

    // A failing role insert rolls back both the role change and the provenance stamp.
    await expect(
      repo.updateUserOidcRoles(u, { role_ids: ["member", "member"], oidc_role_ids: ["member"] }),
    ).rejects.toThrow();
    expect([...(await repo.getUserAssignedRoleIds(u))].sort()).toEqual(["admin", "editor"]);
    expect(await repo.getUserOidcRoleIds(u)).toEqual([]);
  });
});

describe("getUserByOidcIdentity / getUsersByRoleId / updateUserProfile", () => {
  it("finds a user by (issuer, sub) with role ids and the new columns — never by sub alone", async () => {
    await repo.insertUser({
      email: "s@example.com",
      name: "S",
      password_hash: "",
      role_ids: ["member", "editor"],
      auth_provider: "oidc",
      oidc_issuer: "https://a.example.com",
      oidc_sub: "sub-s",
    });
    const user = await repo.getUserByOidcIdentity("https://a.example.com", "sub-s");
    expect(user?.email).toBe("s@example.com");
    expect(user?.auth_provider).toBe("oidc");
    expect(user?.oidc_issuer).toBe("https://a.example.com");
    expect(user?.oidc_sub).toBe("sub-s");
    expect([...(user?.role_ids ?? [])].sort()).toEqual(["editor", "member"]);
    expect(await repo.getUserByOidcIdentity("https://a.example.com", "nope")).toBeUndefined();
    // Same subject at a different provider is a different person.
    expect(await repo.getUserByOidcIdentity("https://b.example.com", "sub-s")).toBeUndefined();
  });

  it("getUsersByRoleId projects auth_provider, oidc_issuer and oidc_sub", async () => {
    await repo.insertUser({
      email: "r@example.com",
      name: "R",
      password_hash: "",
      role_ids: ["editor"],
      auth_provider: "oidc",
      oidc_issuer: "https://a.example.com",
      oidc_sub: "sub-r",
    });
    const rows = await repo.getUsersByRoleId("editor");
    expect(rows).toHaveLength(1);
    expect(rows[0].auth_provider).toBe("oidc");
    expect(rows[0].oidc_issuer).toBe("https://a.example.com");
    expect(rows[0].oidc_sub).toBe("sub-r");
  });

  it("getUserAssignedRoleIds includes inactive-role assignments that getUserRoleIds hides", async () => {
    const [id] = await repo.insertUser({
      email: "ret@example.com",
      name: "Ret",
      password_hash: "",
      role_ids: ["member", "retired"],
    });
    expect([...(await repo.getUserAssignedRoleIds(id))].sort()).toEqual(["member", "retired"]);
    expect([...(await repo.getUserRoleIds(id))].sort()).toEqual(["member"]);
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
  it("upsert inserts, then updates in place for the same group (keeping created_at)", async () => {
    await repo.upsertOidcGroupRoleMapping({ oidc_group: "devs", role_id: "member" });
    await knex("oidc_group_role_mappings").where({ oidc_group: "devs" }).update({ created_at: "2020-01-01 00:00:00" });
    await repo.upsertOidcGroupRoleMapping({ oidc_group: "devs", role_id: "editor" });
    const all = await repo.getAllOidcGroupRoleMappings();
    expect(all).toHaveLength(1);
    expect(all[0].oidc_group).toBe("devs");
    expect(all[0].role_id).toBe("editor");
    expect(String(all[0].created_at)).toBe("2020-01-01 00:00:00");
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

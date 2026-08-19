import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Knex } from "knex";
import { createMemoryDb, migrationSource } from "../testing/memory-db";
import { UsersRepository } from "./users";

let knex: Knex;
let repo: UsersRepository;

beforeEach(async () => {
  // Hermetic against an ambient .env (the dev server's KENER_OIDC_ISSUER_URL would feed the backfill).
  vi.stubEnv("KENER_OIDC_ISSUER_URL", "");
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
  vi.unstubAllEnvs();
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

  it("rolls back even when the composite unique index is already gone", async () => {
    await knex.schema.alterTable("users", (table) => {
      table.dropUnique(["oidc_issuer", "oidc_sub"], "users_oidc_issuer_sub_unique");
    });
    await expect(knex.migrate.down({ migrationSource })).resolves.toBeDefined();
    expect(await knex.schema.hasColumn("users", "oidc_issuer")).toBe(false);
    expect(await knex.schema.hasColumn("users", "oidc_sub")).toBe(false);
  });

  /** Roll back and recreate the schema of an earlier build (oidc_sub with a single-column unique, no issuer). */
  async function recreateLegacyOidcSchema() {
    await knex.migrate.down({ migrationSource });
    await knex.schema.alterTable("users", (table) => {
      table.string("auth_provider", 20).notNullable().defaultTo("local");
      table.string("oidc_sub", 255).nullable().unique();
    });
  }
  const legacyOidcUser = (email: string, sub: string) =>
    knex("users").insert({
      email,
      name: "L",
      password_hash: "",
      auth_provider: "oidc",
      oidc_sub: sub,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    });

  it("upgrades a database from an earlier build that keyed OIDC accounts by subject alone", async () => {
    await recreateLegacyOidcSchema();
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

  it("backfills oidc_issuer for legacy OIDC rows from the saved settings so those accounts stay reachable", async () => {
    await recreateLegacyOidcSchema();
    await legacyOidcUser("legacy@example.com", "sub-legacy");
    await knex("users").insert({ email: "local@example.com", name: "L", password_hash: "h" });
    // Saved in the UI; the stored identifier is the normalized href (what discovery validates against).
    await knex("site_data").insert({
      key: "oidcSettings",
      value: JSON.stringify({ enabled: true, issuer_url: "https://IdP.example.com:443/realms/x" }),
      data_type: "object",
    });
    await knex.migrate.up({ migrationSource });
    const legacy = await knex("users").where({ email: "legacy@example.com" }).first();
    expect(legacy.oidc_issuer).toBe("https://idp.example.com/realms/x");
    expect(await repo.getUserByOidcIdentity("https://idp.example.com/realms/x", "sub-legacy")).toMatchObject({
      email: "legacy@example.com",
    });
    const local = await knex("users").where({ email: "local@example.com" }).first();
    expect(local.oidc_issuer).toBeNull(); // only rows with a subject are touched
  });

  it("prefers KENER_OIDC_ISSUER_URL over the saved settings when backfilling", async () => {
    vi.stubEnv("KENER_OIDC_ISSUER_URL", " https://env.example.com/realms/y ");
    try {
      await recreateLegacyOidcSchema();
      await legacyOidcUser("legacy2@example.com", "sub-legacy-2");
      await knex("site_data").insert({
        key: "oidcSettings",
        value: JSON.stringify({ issuer_url: "https://db.example.com" }),
        data_type: "object",
      });
      await knex.migrate.up({ migrationSource });
      expect((await knex("users").where({ email: "legacy2@example.com" }).first()).oidc_issuer).toBe(
        "https://env.example.com/realms/y",
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("leaves oidc_issuer NULL when no issuer was ever configured (nothing to backfill from)", async () => {
    await recreateLegacyOidcSchema();
    await legacyOidcUser("legacy3@example.com", "sub-legacy-3");
    await knex.migrate.up({ migrationSource });
    expect((await knex("users").where({ email: "legacy3@example.com" }).first()).oidc_issuer).toBeNull();
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

  it("applyOidcRoleSync replaces exactly what the previous sync granted and leaves manual roles alone", async () => {
    // member was granted by OIDC, editor by hand.
    const [u] = await oidcInsert("p4@example.com", ["member", "editor"], ["member"]);
    expect(await repo.applyOidcRoleSync(u, { oidc_role_ids: ["admin"], protect: [] })).toEqual({
      add: ["admin"],
      remove: ["member"],
    });
    expect([...(await repo.getUserAssignedRoleIds(u))].sort()).toEqual(["admin", "editor"]);
    expect(await repo.getUserOidcRoleIds(u)).toEqual(["admin"]);

    // Same grants again → nothing to do, nothing written.
    const before = (await knex("users").where({ id: u }).first()).updated_at;
    expect(await repo.applyOidcRoleSync(u, { oidc_role_ids: ["admin"], protect: [] })).toEqual({ add: [], remove: [] });
    expect((await knex("users").where({ id: u }).first()).updated_at).toEqual(before);
  });

  it("applyOidcRoleSync keeps a hand-assigned role that a mapping names, and revokes a deleted mapping's grant", async () => {
    const [u] = await oidcInsert("p5@example.com", ["admin", "member"], ["member"]); // admin by hand, member granted
    expect(await repo.applyOidcRoleSync(u, { oidc_role_ids: ["member"], protect: [] })).toEqual({
      add: [],
      remove: [],
    });
    expect([...(await repo.getUserAssignedRoleIds(u))].sort()).toEqual(["admin", "member"]);
    // The mapping that granted member is gone; editor is granted now.
    expect(await repo.applyOidcRoleSync(u, { oidc_role_ids: ["editor"], protect: [] })).toEqual({
      add: ["editor"],
      remove: ["member"],
    });
    expect([...(await repo.getUserAssignedRoleIds(u))].sort()).toEqual(["admin", "editor"]);
  });

  it("applyOidcRoleSync never removes a protected role (owner keeps admin) and never grants it as OIDC", async () => {
    const [u] = await oidcInsert("p6@example.com", ["admin"], ["admin"]); // admin came from a mapping that is gone
    expect(await repo.applyOidcRoleSync(u, { oidc_role_ids: ["editor"], protect: ["admin"] })).toEqual({
      add: ["editor"],
      remove: [],
    });
    expect([...(await repo.getUserAssignedRoleIds(u))].sort()).toEqual(["admin", "editor"]);
    expect(await repo.getUserOidcRoleIds(u)).toEqual(["editor"]);
    // Owner without admin at all gets it back.
    await repo.updateUserRoles(u, ["editor"]);
    expect(await repo.applyOidcRoleSync(u, { oidc_role_ids: ["editor"], protect: ["admin"] })).toEqual({
      add: ["admin"],
      remove: [],
    });
  });

  it("applyOidcRoleSync treats a user without provenance as holding only manual roles, then records the grants", async () => {
    const [u] = await oidcInsert("p7@example.com", ["member", "editor"]); // oidc_role_ids NULL
    expect(await repo.applyOidcRoleSync(u, { oidc_role_ids: ["admin"], protect: [] })).toEqual({
      add: ["admin"],
      remove: [],
    });
    expect([...(await repo.getUserAssignedRoleIds(u))].sort()).toEqual(["admin", "editor", "member"]);
    expect(await repo.getUserOidcRoleIds(u)).toEqual(["admin"]);
    // A hand-assigned role that the mapping then also grants is absorbed into provenance (no role change).
    expect(await repo.applyOidcRoleSync(u, { oidc_role_ids: ["admin", "editor"], protect: [] })).toEqual({
      add: [],
      remove: [],
    });
    expect(await repo.getUserOidcRoleIds(u)).toEqual(["admin", "editor"]);
  });

  it("applyOidcRoleSync revokes every previous grant (possibly leaving no roles) when nothing is granted", async () => {
    const [u] = await oidcInsert("p8@example.com", ["editor"], ["editor"]);
    expect(await repo.applyOidcRoleSync(u, { oidc_role_ids: [], protect: [] })).toEqual({
      add: [],
      remove: ["editor"],
    });
    expect(await repo.getUserAssignedRoleIds(u)).toEqual([]);
    expect(await repo.getUserOidcRoleIds(u)).toEqual([]);
  });

  it("applyOidcRoleSync reads the assignments inside its own transaction — a manual change committed just before is honoured", async () => {
    // The sync's inputs (what the IdP grants) were computed while the user had [member]; before the
    // write runs, an admin replaced the roles with [member, editor]. The delta is computed from the
    // committed state, so editor survives and only the stale grant goes.
    const [u] = await oidcInsert("p9@example.com", ["member"], ["member"]);
    await repo.updateUserRoles(u, ["member", "editor"]);
    expect(await repo.applyOidcRoleSync(u, { oidc_role_ids: ["admin"], protect: [] })).toEqual({
      add: ["admin"],
      remove: ["member"],
    });
    expect([...(await repo.getUserAssignedRoleIds(u))].sort()).toEqual(["admin", "editor"]);
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

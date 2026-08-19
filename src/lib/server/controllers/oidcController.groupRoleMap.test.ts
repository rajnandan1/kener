import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// KENER_OIDC_GROUP_ROLE_MAP: env-managed group→role mappings (full replacement of the DB table).

const dbMock = vi.hoisted(() => ({
  getSiteDataByKey: vi.fn(),
  getUserByOidcIdentity: vi.fn(),
  getUserByEmail: vi.fn(),
  insertUser: vi.fn(),
  getOidcRoleIdsForGroups: vi.fn(),
  getAllOidcGroupRoleMappings: vi.fn(),
  getAllRoles: vi.fn(),
  getUserAssignedRoleIds: vi.fn(),
  getUserOidcRoleIds: vi.fn(),
  updateUserRoles: vi.fn(),
  applyOidcRoleSync: vi.fn(),
  updateUserProfile: vi.fn(),
  getRoleById: vi.fn(),
  upsertOidcGroupRoleMapping: vi.fn(),
  deleteOidcGroupRoleMapping: vi.fn(),
}));
vi.mock("$lib/server/db/db", () => ({ default: dbMock }));

const oidcClientMock = vi.hoisted(() => ({
  discovery: vi.fn(),
  allowInsecureRequests: vi.fn(),
  buildAuthorizationUrl: vi.fn(),
  authorizationCodeGrant: vi.fn(),
  fetchUserInfo: vi.fn(),
  randomPKCECodeVerifier: vi.fn(() => "verifier-123"),
  calculatePKCECodeChallenge: vi.fn(async () => "challenge-123"),
}));
vi.mock("openid-client", () => oidcClientMock);

import * as oidc from "./oidcController";
import { expectSingleRoleSyncWrite, publicUser } from "./testing/oidc-fixtures";
import type { OidcSettings } from "../../types/site";

const ENV = oidc.OIDC_GROUP_ROLE_MAP_ENV;

const baseSettings: OidcSettings = {
  enabled: true,
  provider_name: "GitLab",
  issuer_url: "https://gitlab.example.com",
  client_id: "kener",
  client_secret: "s3cret-value",
  scopes: "openid profile email",
  groups_claim: "groups",
  allow_local_login: true,
  auto_create_users: false,
  default_role_id: "member",
};

const allRoles = [
  { id: "admin", role_name: "Admin", status: "ACTIVE" },
  { id: "editor", role_name: "Editor", status: "ACTIVE" },
  { id: "member", role_name: "Member", status: "ACTIVE" },
  { id: "retired", role_name: "Retired", status: "INACTIVE" },
];

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  // Hermetic against an ambient .env (see oidcController.test.ts).
  for (const name of Object.values(oidc.OIDC_ENV_KEYS)) vi.stubEnv(name, "");
  vi.stubEnv(oidc.OIDC_HTTP_ENV, "");
  vi.stubEnv(ENV, "");
  oidc.ClearOidcConfigCache();
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  dbMock.getAllRoles.mockResolvedValue(allRoles);
  dbMock.getAllOidcGroupRoleMappings.mockResolvedValue([]);
  dbMock.getSiteDataByKey.mockResolvedValue(undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
  warn.mockRestore();
});

describe("OIDC_GROUP_ROLE_MAP_ENV", () => {
  it("is a standalone env name, not an OidcSettings field", () => {
    expect(ENV).toBe("KENER_OIDC_GROUP_ROLE_MAP");
    expect(Object.values(oidc.OIDC_ENV_KEYS)).not.toContain(ENV);
  });
});

describe("ParseOidcGroupRoleMapEnv", () => {
  it("is inactive when the variable is unset, empty or whitespace", () => {
    expect(oidc.ParseOidcGroupRoleMapEnv({})).toEqual({ active: false });
    expect(oidc.ParseOidcGroupRoleMapEnv({ [ENV]: "" })).toEqual({ active: false });
    expect(oidc.ParseOidcGroupRoleMapEnv({ [ENV]: "   " })).toEqual({ active: false });
    expect(warn).not.toHaveBeenCalled();
  });

  it("parses a JSON object of group → role id, trimming keys and values", () => {
    const result = oidc.ParseOidcGroupRoleMapEnv({
      [ENV]: ' { "3connect/infra": "admin", " 3connect/devs ": " editor " } ',
    });
    expect(result).toEqual({
      active: true,
      entries: [
        { oidc_group: "3connect/infra", role_id: "admin" },
        { oidc_group: "3connect/devs", role_id: "editor" },
      ],
      invalid: [],
    });
  });

  it("drops entries with an empty or non-string group/role into invalid, keeping the rest", () => {
    const result = oidc.ParseOidcGroupRoleMapEnv({
      [ENV]: '{"  ": "admin", "devs": "   ", "ops": "editor", "nums": 7}',
    });
    expect(result.active).toBe(true);
    if (!result.active) return;
    expect(result.entries).toEqual([{ oidc_group: "ops", role_id: "editor" }]);
    expect(result.invalid.map((e) => e.oidc_group)).toEqual(["", "devs", "nums"]);
    for (const e of result.invalid) expect(e.reason).toMatch(/empty|string/);
  });

  it("is inactive with an error (warned once) for invalid JSON, arrays and scalars", () => {
    for (const raw of ["{not json", '["a","b"]', '"admin"', "42", "null"]) {
      const result = oidc.ParseOidcGroupRoleMapEnv({ [ENV]: raw });
      expect(result.active).toBe(false);
      expect(result).toHaveProperty("error");
      expect((result as { error: string }).error).toMatch(/KENER_OIDC_GROUP_ROLE_MAP/);
    }
    const before = warn.mock.calls.length;
    oidc.ParseOidcGroupRoleMapEnv({ [ENV]: "{not json" });
    oidc.ParseOidcGroupRoleMapEnv({ [ENV]: "{not json" });
    expect(warn.mock.calls.length).toBe(before); // warn-once per distinct bad value
  });

  it("warns again after ClearOidcConfigCache (keeps tests and restarts deterministic)", () => {
    oidc.ParseOidcGroupRoleMapEnv({ [ENV]: "[]" });
    expect(warn).toHaveBeenCalledTimes(1);
    oidc.ClearOidcConfigCache();
    oidc.ParseOidcGroupRoleMapEnv({ [ENV]: "[]" });
    expect(warn).toHaveBeenCalledTimes(2);
  });
});

describe("GetEffectiveOidcGroupRoleMappings", () => {
  const dbRows = [
    { id: 1, oidc_group: "devs", role_id: "editor", created_at: "x", updated_at: "x" },
    { id: 2, oidc_group: "ops", role_id: "admin", created_at: "x", updated_at: "x" },
  ];

  it("returns the database rows (with ids) when the env var is unset", async () => {
    dbMock.getAllOidcGroupRoleMappings.mockResolvedValue(dbRows);
    const view = await oidc.GetEffectiveOidcGroupRoleMappings();
    expect(view).toEqual({ source: "db", mappings: dbRows, invalid: [] });
    expect(dbMock.getAllRoles).not.toHaveBeenCalled();
  });

  it("uses the env map, ignoring the database table entirely, and drops unknown/inactive roles with a warning", async () => {
    vi.stubEnv(
      ENV,
      JSON.stringify({
        "3connect/infra": "admin",
        "3connect/devs": "editor",
        ghosts: "nope",
        olds: "retired",
        "": "admin",
      }),
    );
    dbMock.getAllOidcGroupRoleMappings.mockResolvedValue(dbRows);

    const view = await oidc.GetEffectiveOidcGroupRoleMappings();
    expect(view.source).toBe("env");
    expect(view.error).toBeUndefined();
    expect(view.mappings).toEqual([
      { oidc_group: "3connect/infra", role_id: "admin" },
      { oidc_group: "3connect/devs", role_id: "editor" },
    ]);
    expect(view.invalid).toEqual([
      { oidc_group: "", role_id: "admin", reason: "group and role id must not be empty" },
      { oidc_group: "ghosts", role_id: "nope", reason: expect.stringMatching(/not found/) },
      { oidc_group: "olds", role_id: "retired", reason: expect.stringMatching(/not active/) },
    ]);
    expect(dbMock.getAllOidcGroupRoleMappings).not.toHaveBeenCalled();

    // One warning per dropped entry, and none again on the next call.
    expect(warn).toHaveBeenCalledTimes(3);
    await oidc.GetEffectiveOidcGroupRoleMappings();
    expect(warn).toHaveBeenCalledTimes(3);
  });

  it("stays on the env source with no mappings when every entry is invalid", async () => {
    vi.stubEnv(ENV, JSON.stringify({ ghosts: "nope" }));
    dbMock.getAllOidcGroupRoleMappings.mockResolvedValue(dbRows);
    const view = await oidc.GetEffectiveOidcGroupRoleMappings();
    expect(view.source).toBe("env");
    expect(view.mappings).toEqual([]);
    expect(view.invalid).toHaveLength(1);
  });

  it("falls back to the database rows and reports the error when the env var is unparseable", async () => {
    vi.stubEnv(ENV, "{oops");
    dbMock.getAllOidcGroupRoleMappings.mockResolvedValue(dbRows);
    const view = await oidc.GetEffectiveOidcGroupRoleMappings();
    expect(view.source).toBe("db");
    expect(view.mappings).toEqual(dbRows);
    expect(view.error).toMatch(/KENER_OIDC_GROUP_ROLE_MAP/);
  });
});

describe("role sync under KENER_OIDC_GROUP_ROLE_MAP", () => {
  const identity = {
    issuer: baseSettings.issuer_url,
    sub: "sub-7",
    email: "u@example.com",
    name: "U",
    groups: ["devs"],
  };

  beforeEach(() => {
    vi.stubEnv(ENV, JSON.stringify({ devs: "editor", ops: "admin", olds: "retired" }));
    // Rows that must be ignored while the env map is active: they map the same
    // group to a different role.
    dbMock.getAllOidcGroupRoleMappings.mockResolvedValue([
      { id: 1, oidc_group: "devs", role_id: "admin" },
      { id: 2, oidc_group: "qa", role_id: "member" },
    ]);
    dbMock.getOidcRoleIdsForGroups.mockRejectedValue(new Error("DB mappings must not be consulted"));
    dbMock.getUserByOidcIdentity.mockResolvedValue(publicUser());
    dbMock.getRoleById.mockResolvedValue({ id: "member", status: "ACTIVE" });
    dbMock.getUserOidcRoleIds.mockResolvedValue([]);
  });

  /** The single write the sync makes: { role_ids?: string[]; oidc_role_ids: string[] }. */
  const change = () => expectSingleRoleSyncWrite(dbMock);

  it("grants the role mapped by the env map without consulting the database mappings", async () => {
    dbMock.getUserAssignedRoleIds.mockResolvedValue([]);
    await oidc.FindOrCreateOidcUser(baseSettings, identity);
    expect(change()).toEqual({ add: ["editor"], remove: [], oidc_role_ids: ["editor"] });
    expect(dbMock.getAllOidcGroupRoleMappings).not.toHaveBeenCalled();
    expect(dbMock.getOidcRoleIdsForGroups).not.toHaveBeenCalled();
  });

  it("revokes an env-granted role when the user leaves the group (falls back to the default role)", async () => {
    dbMock.getUserAssignedRoleIds.mockResolvedValue(["editor"]);
    dbMock.getUserOidcRoleIds.mockResolvedValue(["editor"]);
    await oidc.FindOrCreateOidcUser(baseSettings, { ...identity, groups: [] });
    expect(change()).toEqual({ add: ["member"], remove: ["editor"], oidc_role_ids: ["member"] });
  });

  it("preserves manual roles and revokes env-granted roles the user no longer qualifies for", async () => {
    // "custom" was assigned by hand → kept. "admin" was granted by the last sync (ops) and the
    // user is no longer in ops → revoked.
    dbMock.getUserAssignedRoleIds.mockResolvedValue(["custom", "admin"]);
    dbMock.getUserOidcRoleIds.mockResolvedValue(["admin"]);
    await oidc.FindOrCreateOidcUser(baseSettings, identity);
    expect(change()).toEqual({ add: ["editor"], remove: ["admin"], oidc_role_ids: ["editor"] });
  });

  it("revokes a previously env-granted role that has since been deactivated (dropped from the map)", async () => {
    // olds→retired is dropped from the effective mappings (inactive) and therefore not re-granted;
    // the sync granted it earlier, so it is revoked rather than retained as manual.
    dbMock.getUserAssignedRoleIds.mockResolvedValue(["retired"]);
    dbMock.getUserOidcRoleIds.mockResolvedValue(["retired"]);
    await oidc.FindOrCreateOidcUser(baseSettings, { ...identity, groups: ["olds"] });
    expect(change()).toEqual({ add: ["member"], remove: ["retired"], oidc_role_ids: ["member"] });
  });

  it("revokes roles that the database mappings granted once the env map takes over", async () => {
    // Before the env map: DB row devs→admin granted admin. Now devs→editor: admin is revoked,
    // editor granted — no stale role sticks to the user.
    dbMock.getUserAssignedRoleIds.mockResolvedValue(["admin"]);
    dbMock.getUserOidcRoleIds.mockResolvedValue(["admin"]);
    await oidc.FindOrCreateOidcUser(baseSettings, identity);
    expect(change()).toEqual({ add: ["editor"], remove: ["admin"], oidc_role_ids: ["editor"] });
  });

  it("treats a manually granted role as manual even when a database row or the env map names it", async () => {
    vi.stubEnv(ENV, JSON.stringify({ devs: "editor", ops: "admin" }));
    dbMock.getUserAssignedRoleIds.mockResolvedValue(["admin"]); // granted by hand, user not in ops
    await oidc.FindOrCreateOidcUser(baseSettings, identity);
    expect(change()).toEqual({ add: ["editor"], remove: [], oidc_role_ids: ["editor"] });
  });

  it("never grants an inactive role from the env map", async () => {
    dbMock.getUserAssignedRoleIds.mockResolvedValue(["member"]);
    dbMock.getUserOidcRoleIds.mockResolvedValue(["member"]);
    await oidc.FindOrCreateOidcUser(baseSettings, { ...identity, groups: ["olds"] });
    expect(dbMock.applyOidcRoleSync).not.toHaveBeenCalled(); // default role already held, retired never added
  });

  it("never strips admin from the owner account", async () => {
    dbMock.getUserByOidcIdentity.mockResolvedValue(publicUser({ is_owner: "YES", role_ids: ["admin"] }));
    dbMock.getUserAssignedRoleIds.mockResolvedValue(["admin"]);
    dbMock.getUserOidcRoleIds.mockResolvedValue(["admin"]);
    await oidc.FindOrCreateOidcUser(baseSettings, identity);
    expect(change()).toEqual({ add: ["editor"], remove: [], oidc_role_ids: ["editor"] }); // admin stays
  });

  it("provisions a new user with the env-mapped roles and records them as OIDC-granted", async () => {
    dbMock.getUserByOidcIdentity
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(publicUser({ oidc_sub: "sub-new", role_ids: ["editor"] }));
    dbMock.getUserByEmail.mockResolvedValue(undefined);
    await oidc.FindOrCreateOidcUser(
      { ...baseSettings, auto_create_users: true },
      {
        issuer: baseSettings.issuer_url,
        sub: "sub-new",
        email: "new@example.com",
        name: "New",
        groups: ["devs", "unknown"],
      },
    );
    expect(dbMock.insertUser).toHaveBeenCalledWith(
      expect.objectContaining({ role_ids: ["editor"], oidc_role_ids: ["editor"] }),
    );
    expect(dbMock.getOidcRoleIdsForGroups).not.toHaveBeenCalled();
  });
});

describe("write guards under KENER_OIDC_GROUP_ROLE_MAP", () => {
  it("upsert and delete refuse with a message naming the env var while the map is active", async () => {
    vi.stubEnv(ENV, JSON.stringify({ devs: "editor" }));
    dbMock.getRoleById.mockResolvedValue({ id: "member", status: "ACTIVE" });
    await expect(oidc.UpsertOidcGroupRoleMapping({ oidc_group: "devs", role_id: "member" })).rejects.toThrow(
      /managed by KENER_OIDC_GROUP_ROLE_MAP/,
    );
    await expect(oidc.DeleteOidcGroupRoleMapping(1)).rejects.toThrow(/managed by KENER_OIDC_GROUP_ROLE_MAP/);
    expect(dbMock.upsertOidcGroupRoleMapping).not.toHaveBeenCalled();
    expect(dbMock.deleteOidcGroupRoleMapping).not.toHaveBeenCalled();
  });

  it("still write to the database when the env var is unparseable (DB mappings are in effect)", async () => {
    vi.stubEnv(ENV, "{oops");
    dbMock.getRoleById.mockResolvedValue({ id: "member", status: "ACTIVE" });
    dbMock.deleteOidcGroupRoleMapping.mockResolvedValue(1);
    await oidc.UpsertOidcGroupRoleMapping({ oidc_group: "devs", role_id: "member" });
    await oidc.DeleteOidcGroupRoleMapping(1);
    expect(dbMock.upsertOidcGroupRoleMapping).toHaveBeenCalledWith({ oidc_group: "devs", role_id: "member" });
    expect(dbMock.deleteOidcGroupRoleMapping).toHaveBeenCalledWith(1);
  });
});

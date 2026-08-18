import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---- shared mocks (also used by later describe blocks in this file) ----
const dbMock = vi.hoisted(() => ({
  getSiteDataByKey: vi.fn(),
  getUserByOidcSub: vi.fn(),
  getUserByEmail: vi.fn(),
  insertUser: vi.fn(),
  getOidcRoleIdsForGroups: vi.fn(),
  getAllOidcGroupRoleMappings: vi.fn(),
  getUserRoleIds: vi.fn(),
  getUserAssignedRoleIds: vi.fn(),
  updateUserRoles: vi.fn(),
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
import type { OidcSettings } from "../../types/site";

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

/** Makes db.getSiteDataByKey("oidcSettings") return the given (partial) settings object. */
function storeSettings(partial: Partial<OidcSettings> | null) {
  dbMock.getSiteDataByKey.mockImplementation(async (key: string) =>
    key === "oidcSettings" && partial ? { key, value: JSON.stringify(partial), data_type: "object" } : undefined,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  // Neutralize any ambient KENER_OIDC_* / KENER_OIDC_ALLOW_HTTP set in the environment (e.g. via a
  // local .env used for manual acceptance testing) so these tests are hermetic. An empty string is
  // treated as unset by ParseOidcEnvOverrides, and IsOidcHttpAllowed requires exactly "true".
  for (const name of Object.values(oidc.OIDC_ENV_KEYS)) vi.stubEnv(name, "");
  vi.stubEnv(oidc.OIDC_HTTP_ENV, "");
  oidc.ClearOidcConfigCache();
  oidcClientMock.randomPKCECodeVerifier.mockReturnValue("verifier-123");
  oidcClientMock.calculatePKCECodeChallenge.mockResolvedValue("challenge-123");
  storeSettings(baseSettings);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("ParseOidcEnvOverrides", () => {
  it("returns nothing when no KENER_OIDC_* variable is set", () => {
    const { overrides, locked } = oidc.ParseOidcEnvOverrides({});
    expect(overrides).toEqual({});
    expect(locked.size).toBe(0);
  });

  it("maps every field key, trims strings and parses booleans case-insensitively", () => {
    const { overrides, locked } = oidc.ParseOidcEnvOverrides({
      KENER_OIDC_ENABLED: "TRUE",
      KENER_OIDC_PROVIDER_NAME: " GitLab ",
      KENER_OIDC_ISSUER_URL: "https://idp.example.com",
      KENER_OIDC_CLIENT_ID: "cid",
      KENER_OIDC_CLIENT_SECRET: "csecret",
      KENER_OIDC_SCOPES: "openid email groups",
      KENER_OIDC_GROUPS_CLAIM: "roles",
      KENER_OIDC_ALLOW_LOCAL_LOGIN: "false",
      KENER_OIDC_AUTO_CREATE_USERS: "True",
      KENER_OIDC_DEFAULT_ROLE_ID: "editor",
    });
    expect(overrides).toEqual({
      enabled: true,
      provider_name: "GitLab",
      issuer_url: "https://idp.example.com",
      client_id: "cid",
      client_secret: "csecret",
      scopes: "openid email groups",
      groups_claim: "roles",
      allow_local_login: false,
      auto_create_users: true,
      default_role_id: "editor",
    });
    expect([...locked].sort()).toEqual(Object.keys(oidc.OIDC_ENV_KEYS).sort());
  });

  it("ignores empty values and invalid booleans (with a warning), leaving those fields unlocked", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { overrides, locked } = oidc.ParseOidcEnvOverrides({
      KENER_OIDC_CLIENT_ID: "   ",
      KENER_OIDC_ENABLED: "yes",
      KENER_OIDC_PROVIDER_NAME: "X",
    });
    expect(overrides).toEqual({ provider_name: "X" });
    expect([...locked]).toEqual(["provider_name"]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("GetEffectiveOidcSettings / GetOidcPublicState", () => {
  it("falls back to seed defaults when nothing is stored", async () => {
    storeSettings(null);
    const { settings, envLocked } = await oidc.GetEffectiveOidcSettings();
    expect(settings.enabled).toBe(false);
    expect(settings.scopes).toBe("openid profile email");
    expect(settings.auto_create_users).toBe(false);
    expect(envLocked.size).toBe(0);
  });

  it("overlays env per key on top of the stored value", async () => {
    vi.stubEnv("KENER_OIDC_CLIENT_SECRET", "env-secret");
    vi.stubEnv("KENER_OIDC_ALLOW_LOCAL_LOGIN", "false");
    const { settings, envLocked } = await oidc.GetEffectiveOidcSettings();
    expect(settings.client_secret).toBe("env-secret");
    expect(settings.allow_local_login).toBe(false);
    expect(settings.client_id).toBe("kener"); // untouched DB value
    expect([...envLocked].sort()).toEqual(["allow_local_login", "client_secret"]);
  });

  it("public state hides everything when disabled and defaults providerName to SSO", async () => {
    storeSettings({ ...baseSettings, enabled: false });
    expect(await oidc.GetOidcPublicState()).toEqual({ enabled: false, providerName: "", allowLocalLogin: true });
    storeSettings({ ...baseSettings, provider_name: "", allow_local_login: false });
    expect(await oidc.GetOidcPublicState()).toEqual({ enabled: true, providerName: "SSO", allowLocalLogin: false });
  });
});

describe("GetOidcCallbackUrl", () => {
  it("uses ORIGIN and KENER_BASE_PATH, trimming trailing slashes", () => {
    vi.stubEnv("ORIGIN", "https://status.example.com/");
    vi.stubEnv("KENER_BASE_PATH", "/status/");
    expect(oidc.GetOidcCallbackUrl()).toBe("https://status.example.com/status/account/oidc/callback");
  });

  it("falls back to the request origin when ORIGIN is unset", () => {
    vi.stubEnv("ORIGIN", "");
    vi.stubEnv("KENER_BASE_PATH", "");
    expect(oidc.GetOidcCallbackUrl("http://localhost:3000")).toBe("http://localhost:3000/account/oidc/callback");
  });
});

describe("ParseIssuerUrl", () => {
  it("accepts https and rejects http unless KENER_OIDC_ALLOW_HTTP=true", () => {
    expect(oidc.ParseIssuerUrl("https://idp.example.com/realms/x").href).toBe("https://idp.example.com/realms/x");
    expect(() => oidc.ParseIssuerUrl("http://idp.local")).toThrow(/KENER_OIDC_ALLOW_HTTP/);
    expect(() => oidc.ParseIssuerUrl("not a url")).toThrow(/valid absolute URL/);
    vi.stubEnv("KENER_OIDC_ALLOW_HTTP", "true");
    expect(oidc.ParseIssuerUrl("http://idp.local").protocol).toBe("http:");
  });
});

describe("MaskOidcSettings", () => {
  it("masks the secret and reports whether one is stored", () => {
    const masked = oidc.MaskOidcSettings(baseSettings);
    expect(masked.client_secret).not.toContain("s3cret");
    expect(masked.client_secret.endsWith("alue")).toBe(true);
    expect(masked.has_client_secret).toBe(true);
    expect(masked.client_id).toBe("kener");
    const empty = oidc.MaskOidcSettings({ ...baseSettings, client_secret: "" });
    expect(empty.client_secret).toBe("");
    expect(empty.has_client_secret).toBe(false);
  });
});

function fakeConfig(meta: Record<string, string | undefined> = {}) {
  return {
    serverMetadata: () => ({
      issuer: "https://gitlab.example.com",
      authorization_endpoint: "https://gitlab.example.com/oauth/authorize",
      token_endpoint: "https://gitlab.example.com/oauth/token",
      userinfo_endpoint: "https://gitlab.example.com/oauth/userinfo",
      ...meta,
    }),
  };
}

function fakeTokens(claims: Record<string, unknown> | null, accessToken: string | undefined = "at") {
  return { access_token: accessToken, claims: () => claims };
}

const publicUser = (over: Record<string, unknown> = {}) => ({
  id: 7,
  email: "u@example.com",
  name: "U",
  is_active: 1,
  is_verified: 1,
  is_owner: "NO",
  auth_provider: "oidc",
  oidc_sub: "sub-7",
  role_ids: ["member"],
  created_at: new Date(),
  updated_at: new Date(),
  ...over,
});

describe("BuildAuthorizationUrl / config cache", () => {
  it("performs discovery once per effective credentials and passes PKCE, state and nonce", async () => {
    oidcClientMock.discovery.mockResolvedValue(fakeConfig());
    oidcClientMock.buildAuthorizationUrl.mockReturnValue(new URL("https://gitlab.example.com/oauth/authorize?x=1"));
    const first = await oidc.BuildAuthorizationUrl(baseSettings, "https://status.example.com/account/oidc/callback");
    await oidc.BuildAuthorizationUrl(baseSettings, "https://status.example.com/account/oidc/callback");
    expect(oidcClientMock.discovery).toHaveBeenCalledTimes(1);
    expect(first.url).toBe("https://gitlab.example.com/oauth/authorize?x=1");
    expect(first.codeVerifier).toBe("verifier-123");
    const params = oidcClientMock.buildAuthorizationUrl.mock.calls[0][1] as Record<string, string>;
    expect(params.redirect_uri).toBe("https://status.example.com/account/oidc/callback");
    expect(params.code_challenge).toBe("challenge-123");
    expect(params.code_challenge_method).toBe("S256");
    expect(params.state).toBe(first.state);
    expect(params.nonce).toBe(first.nonce);
    expect(params.scope).toBe("openid profile email");
  });

  it("re-discovers when client_secret changes and after ClearOidcConfigCache", async () => {
    oidcClientMock.discovery.mockResolvedValue(fakeConfig());
    oidcClientMock.buildAuthorizationUrl.mockReturnValue(new URL("https://x/y"));
    await oidc.BuildAuthorizationUrl(baseSettings, "cb");
    await oidc.BuildAuthorizationUrl({ ...baseSettings, client_secret: "rotated" }, "cb");
    expect(oidcClientMock.discovery).toHaveBeenCalledTimes(2);
    oidc.ClearOidcConfigCache();
    await oidc.BuildAuthorizationUrl({ ...baseSettings, client_secret: "rotated" }, "cb");
    expect(oidcClientMock.discovery).toHaveBeenCalledTimes(3);
  });

  it("refuses an http issuer unless KENER_OIDC_ALLOW_HTTP=true, then passes allowInsecureRequests", async () => {
    oidcClientMock.discovery.mockResolvedValue(fakeConfig());
    oidcClientMock.buildAuthorizationUrl.mockReturnValue(new URL("https://x/y"));
    await expect(oidc.BuildAuthorizationUrl({ ...baseSettings, issuer_url: "http://idp.local" }, "cb")).rejects.toThrow(
      /https/,
    );
    vi.stubEnv("KENER_OIDC_ALLOW_HTTP", "true");
    await oidc.BuildAuthorizationUrl({ ...baseSettings, issuer_url: "http://idp.local" }, "cb");
    const options = oidcClientMock.discovery.mock.calls[0][4] as { execute: unknown[] };
    expect(options.execute).toContain(oidcClientMock.allowInsecureRequests);
  });
});

describe("ExtractGroups", () => {
  it("handles array, string and missing claims", () => {
    expect(oidc.ExtractGroups({ groups: ["a", 1] }, "groups")).toEqual(["a", "1"]);
    expect(oidc.ExtractGroups({ roles: "solo" }, "roles")).toEqual(["solo"]);
    expect(oidc.ExtractGroups({}, "groups")).toEqual([]);
    expect(oidc.ExtractGroups({ groups: { nested: true } }, "groups")).toEqual([]);
  });
});

describe("HandleCallback", () => {
  const callbackUrl = "https://status.example.com/account/oidc/callback";
  // Behind a proxy the request URL may differ from the registered redirect URI; the
  // token exchange must still send the registered one.
  const cbUrl = new URL("http://kener-internal:3000/account/oidc/callback?code=abc&state=st");
  beforeEach(() => {
    oidcClientMock.discovery.mockResolvedValue(fakeConfig());
  });

  it("returns the identity from ID token claims (email lower-cased, name fallback chain)", async () => {
    oidcClientMock.authorizationCodeGrant.mockResolvedValue(
      fakeTokens({ sub: "sub-1", email: " Ada@Example.COM ", preferred_username: "ada", groups: ["devs"] }),
    );
    const identity = await oidc.HandleCallback(baseSettings, callbackUrl, cbUrl, "st", "nn", "verifier-123");
    expect(identity).toEqual({ sub: "sub-1", email: "ada@example.com", name: "ada", groups: ["devs"] });
    const exchangeUrl = oidcClientMock.authorizationCodeGrant.mock.calls[0][1] as URL;
    expect(exchangeUrl.href).toBe("https://status.example.com/account/oidc/callback?code=abc&state=st");
    const grantOpts = oidcClientMock.authorizationCodeGrant.mock.calls[0][2] as Record<string, string>;
    expect(grantOpts).toEqual({ pkceCodeVerifier: "verifier-123", expectedState: "st", expectedNonce: "nn" });
    expect(oidcClientMock.fetchUserInfo).not.toHaveBeenCalled();
  });

  it("falls back to userinfo only when the ID token has no email", async () => {
    oidcClientMock.authorizationCodeGrant.mockResolvedValue(fakeTokens({ sub: "sub-2" }));
    oidcClientMock.fetchUserInfo.mockResolvedValue({ email: "ui@example.com", name: "From Userinfo" });
    const identity = await oidc.HandleCallback(baseSettings, callbackUrl, cbUrl, "st", "nn", "v");
    expect(identity.email).toBe("ui@example.com");
    expect(identity.name).toBe("From Userinfo");
    expect(oidcClientMock.fetchUserInfo).toHaveBeenCalledWith(expect.anything(), "at", "sub-2");
  });

  it("throws OidcAuthError(auth_failed) when sub or email are missing", async () => {
    oidcClientMock.authorizationCodeGrant.mockResolvedValue(fakeTokens({ email: "x@example.com" }));
    await expect(oidc.HandleCallback(baseSettings, callbackUrl, cbUrl, "st", "nn", "v")).rejects.toMatchObject({
      code: "auth_failed",
    });
    oidcClientMock.authorizationCodeGrant.mockResolvedValue(fakeTokens({ sub: "s" }, ""));
    await expect(oidc.HandleCallback(baseSettings, callbackUrl, cbUrl, "st", "nn", "v")).rejects.toMatchObject({
      code: "auth_failed",
    });
  });
});

describe("FindOrCreateOidcUser — provisioning", () => {
  const identity = { sub: "sub-new", email: "new@example.com", name: "New", groups: ["devs"] };

  it("rejects unknown users when auto_create_users is off", async () => {
    dbMock.getUserByOidcSub.mockResolvedValue(undefined);
    await expect(
      oidc.FindOrCreateOidcUser({ ...baseSettings, auto_create_users: false }, identity),
    ).rejects.toMatchObject({ code: "not_provisioned" });
    expect(dbMock.insertUser).not.toHaveBeenCalled();
  });

  it("rejects with the same not_provisioned code when the email belongs to another account", async () => {
    dbMock.getUserByOidcSub.mockResolvedValue(undefined);
    dbMock.getUserByEmail.mockResolvedValue(publicUser({ id: 1, auth_provider: "local", oidc_sub: null }));
    await expect(
      oidc.FindOrCreateOidcUser({ ...baseSettings, auto_create_users: true }, identity),
    ).rejects.toMatchObject({ code: "not_provisioned" });
    expect(dbMock.insertUser).not.toHaveBeenCalled();
  });

  it("creates a verified, active OIDC user with mapped roles", async () => {
    dbMock.getUserByOidcSub
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(publicUser({ oidc_sub: "sub-new", role_ids: ["editor"] }));
    dbMock.getUserByEmail.mockResolvedValue(undefined);
    dbMock.getOidcRoleIdsForGroups.mockResolvedValue(["editor"]);
    const user = await oidc.FindOrCreateOidcUser({ ...baseSettings, auto_create_users: true }, identity);
    expect(dbMock.insertUser).toHaveBeenCalledWith({
      email: "new@example.com",
      name: "New",
      password_hash: "",
      role_ids: ["editor"],
      auth_provider: "oidc",
      oidc_sub: "sub-new",
      is_active: 1,
      is_verified: 1,
    });
    expect(user.role_ids).toEqual(["editor"]);
  });

  it("uses default_role_id, then member, when no group matches", async () => {
    dbMock.getUserByOidcSub.mockResolvedValueOnce(undefined).mockResolvedValueOnce(publicUser());
    dbMock.getUserByEmail.mockResolvedValue(undefined);
    dbMock.getOidcRoleIdsForGroups.mockResolvedValue([]);
    await oidc.FindOrCreateOidcUser({ ...baseSettings, auto_create_users: true, default_role_id: "viewer" }, identity);
    expect(dbMock.insertUser.mock.calls[0][0].role_ids).toEqual(["viewer"]);
    dbMock.getUserByOidcSub.mockResolvedValueOnce(undefined).mockResolvedValueOnce(publicUser());
    await oidc.FindOrCreateOidcUser({ ...baseSettings, auto_create_users: true, default_role_id: "" }, identity);
    expect(dbMock.insertUser.mock.calls[1][0].role_ids).toEqual(["member"]);
  });

  it("maps a unique-constraint race on insert to not_provisioned", async () => {
    dbMock.getUserByOidcSub.mockResolvedValue(undefined);
    dbMock.getUserByEmail.mockResolvedValue(undefined);
    dbMock.getOidcRoleIdsForGroups.mockResolvedValue([]);
    dbMock.insertUser.mockRejectedValue(new Error("SQLITE_CONSTRAINT: UNIQUE constraint failed: users.email"));
    await expect(
      oidc.FindOrCreateOidcUser({ ...baseSettings, auto_create_users: true }, identity),
    ).rejects.toMatchObject({ code: "not_provisioned" });
  });
});

describe("FindOrCreateOidcUser — existing user sync", () => {
  const identity = { sub: "sub-7", email: "u@example.com", name: "U", groups: ["devs"] };

  beforeEach(() => {
    dbMock.getUserByOidcSub.mockResolvedValue(publicUser());
    dbMock.getAllOidcGroupRoleMappings.mockResolvedValue([
      { id: 1, oidc_group: "devs", role_id: "editor" },
      { id: 2, oidc_group: "ops", role_id: "admin" },
    ]);
    dbMock.getRoleById.mockResolvedValue({ id: "member", status: "ACTIVE" });
  });

  it("replaces managed roles from current groups and preserves manual roles", async () => {
    dbMock.getUserAssignedRoleIds.mockResolvedValue(["admin", "custom"]); // admin was mapped from ops; custom is manual
    dbMock.getOidcRoleIdsForGroups.mockResolvedValue(["editor"]);
    await oidc.FindOrCreateOidcUser(baseSettings, identity);
    expect(dbMock.getOidcRoleIdsForGroups).toHaveBeenCalledWith(["devs"]);
    const [, roles] = dbMock.updateUserRoles.mock.calls[0];
    expect([...roles].sort()).toEqual(["custom", "editor"]);
  });

  it("falls back to the default role and does not write when nothing changed", async () => {
    dbMock.getUserAssignedRoleIds.mockResolvedValue(["member"]);
    dbMock.getOidcRoleIdsForGroups.mockResolvedValue([]);
    await oidc.FindOrCreateOidcUser(baseSettings, { ...identity, groups: [] });
    expect(dbMock.updateUserRoles).not.toHaveBeenCalled();
  });

  it("preserves a manual assignment to an inactive role", async () => {
    // "retired" is an inactive role the user was manually assigned to before it
    // was deactivated; "admin" is mapped from the "ops" group (not present here).
    dbMock.getUserAssignedRoleIds.mockResolvedValue(["retired", "admin"]);
    dbMock.getOidcRoleIdsForGroups.mockResolvedValue(["editor"]);
    await oidc.FindOrCreateOidcUser(baseSettings, identity);
    const [, roles] = dbMock.updateUserRoles.mock.calls[0];
    expect([...roles].sort()).toEqual(["editor", "retired"]);
  });

  it("does not fall back to an inactive default role and does not write when nothing changed", async () => {
    dbMock.getRoleById.mockResolvedValue({ id: "member", status: "INACTIVE" });
    dbMock.getUserAssignedRoleIds.mockResolvedValue([]);
    dbMock.getOidcRoleIdsForGroups.mockResolvedValue([]);
    await oidc.FindOrCreateOidcUser(baseSettings, { ...identity, groups: [] });
    expect(dbMock.updateUserRoles).not.toHaveBeenCalled();
  });

  it("never strips admin from the owner account", async () => {
    dbMock.getUserByOidcSub.mockResolvedValue(publicUser({ is_owner: "YES", role_ids: ["admin"] }));
    dbMock.getUserAssignedRoleIds.mockResolvedValue(["admin"]);
    dbMock.getOidcRoleIdsForGroups.mockResolvedValue(["editor"]);
    await oidc.FindOrCreateOidcUser(baseSettings, identity);
    const [, roles] = dbMock.updateUserRoles.mock.calls[0];
    expect([...roles].sort()).toEqual(["admin", "editor"]);
  });

  it("syncs name and email, but keeps the old email when another account owns the new one", async () => {
    dbMock.getUserAssignedRoleIds.mockResolvedValue(["member"]);
    dbMock.getOidcRoleIdsForGroups.mockResolvedValue([]);
    dbMock.getUserByEmail.mockResolvedValue(undefined);
    await oidc.FindOrCreateOidcUser(baseSettings, { ...identity, name: "Renamed", email: "fresh@example.com" });
    expect(dbMock.updateUserProfile).toHaveBeenCalledWith(7, { name: "Renamed", email: "fresh@example.com" });

    dbMock.updateUserProfile.mockClear();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    dbMock.getUserByEmail.mockResolvedValue(publicUser({ id: 99, auth_provider: "local" }));
    await oidc.FindOrCreateOidcUser(baseSettings, { ...identity, name: "Renamed2", email: "taken@example.com" });
    expect(dbMock.updateUserProfile).toHaveBeenCalledWith(7, { name: "Renamed2" });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("tolerates a concurrent insert of the same email during profile sync (keeps old email, still syncs name)", async () => {
    dbMock.getUserAssignedRoleIds.mockResolvedValue(["member"]);
    dbMock.getOidcRoleIdsForGroups.mockResolvedValue([]);
    dbMock.getUserByEmail.mockResolvedValue(undefined); // no collision seen at check time
    dbMock.updateUserProfile
      .mockRejectedValueOnce(new Error("UNIQUE constraint failed: users.email"))
      .mockResolvedValueOnce(1);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const user = await oidc.FindOrCreateOidcUser(baseSettings, {
      ...identity,
      name: "Renamed",
      email: "raced@example.com",
    });
    expect(user).toBeDefined();
    expect(dbMock.updateUserProfile).toHaveBeenCalledTimes(2);
    expect(dbMock.updateUserProfile.mock.calls[0]).toEqual([7, { name: "Renamed", email: "raced@example.com" }]);
    expect(dbMock.updateUserProfile.mock.calls[1]).toEqual([7, { name: "Renamed" }]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("TestOidcConnection", () => {
  it("returns endpoints on success without touching the shared cache", async () => {
    oidcClientMock.discovery.mockResolvedValue(fakeConfig());
    const result = await oidc.TestOidcConnection(baseSettings);
    expect(result).toEqual({
      success: true,
      issuer: "https://gitlab.example.com",
      authorizationEndpoint: "https://gitlab.example.com/oauth/authorize",
      tokenEndpoint: "https://gitlab.example.com/oauth/token",
      userinfoEndpoint: "https://gitlab.example.com/oauth/userinfo",
    });
    // A subsequent login-path call must still discover (cache untouched by the test)
    oidcClientMock.buildAuthorizationUrl.mockReturnValue(new URL("https://x/y"));
    await oidc.BuildAuthorizationUrl(baseSettings, "cb");
    expect(oidcClientMock.discovery).toHaveBeenCalledTimes(2);
  });

  it("reports discovery and scheme errors as { success: false }", async () => {
    oidcClientMock.discovery.mockRejectedValue(new Error("boom"));
    expect(await oidc.TestOidcConnection(baseSettings)).toEqual({
      success: false,
      error: "OIDC Discovery failed: boom",
    });
    const http = await oidc.TestOidcConnection({ ...baseSettings, issuer_url: "http://idp.local" });
    expect(http.success).toBe(false);
    expect(http.error).toMatch(/KENER_OIDC_ALLOW_HTTP/);
  });
});

describe("PrepareOidcSettingsForStore", () => {
  beforeEach(() => {
    dbMock.getRoleById.mockResolvedValue({ id: "member", role_name: "Member", status: "ACTIVE" });
  });

  it("keeps the stored secret when the field is omitted, clears it on empty string, replaces it otherwise", async () => {
    const omitted = JSON.parse(await oidc.PrepareOidcSettingsForStore({ ...baseSettings, client_secret: undefined }));
    expect(omitted.client_secret).toBe("s3cret-value");
    const cleared = JSON.parse(await oidc.PrepareOidcSettingsForStore({ ...baseSettings, client_secret: "" }));
    expect(cleared.client_secret).toBe("");
    const replaced = JSON.parse(
      await oidc.PrepareOidcSettingsForStore(JSON.stringify({ ...baseSettings, client_secret: "new" })),
    );
    expect(replaced.client_secret).toBe("new");
  });

  it("drops env-locked fields and unknown keys before validating", async () => {
    vi.stubEnv("KENER_OIDC_ISSUER_URL", "https://env.example.com");
    const stored = JSON.parse(
      await oidc.PrepareOidcSettingsForStore({
        ...baseSettings,
        issuer_url: "https://attacker.example.com",
        has_client_secret: true,
        env_locked: ["issuer_url"],
        redirect_uri: "x",
      }),
    );
    expect(stored.issuer_url).toBe("https://gitlab.example.com"); // DB value untouched, env value not persisted
    expect(stored).not.toHaveProperty("has_client_secret");
    expect(stored).not.toHaveProperty("env_locked");
  });

  it("rejects invalid payloads and unknown default roles", async () => {
    await expect(oidc.PrepareOidcSettingsForStore("{{")).rejects.toThrow(/Invalid OIDC settings/);
    await expect(oidc.PrepareOidcSettingsForStore({ ...baseSettings, issuer_url: "ftp://x" })).rejects.toThrow(
      /Invalid OIDC settings/,
    );
    dbMock.getRoleById.mockResolvedValue(undefined);
    await expect(oidc.PrepareOidcSettingsForStore({ ...baseSettings, default_role_id: "ghost" })).rejects.toThrow(
      /Role "ghost" not found/,
    );
  });
});

describe("mapping helpers", () => {
  it("UpsertOidcGroupRoleMapping validates group, role existence and role status", async () => {
    await expect(oidc.UpsertOidcGroupRoleMapping({ oidc_group: "  ", role_id: "member" })).rejects.toThrow(
      /group name is required/,
    );
    await expect(oidc.UpsertOidcGroupRoleMapping({ oidc_group: "devs" })).rejects.toThrow(/Role ID is required/);
    dbMock.getRoleById.mockResolvedValue(undefined);
    await expect(oidc.UpsertOidcGroupRoleMapping({ oidc_group: "devs", role_id: "ghost" })).rejects.toThrow(
      /not found/,
    );
    dbMock.getRoleById.mockResolvedValue({ id: "old", status: "INACTIVE" });
    await expect(oidc.UpsertOidcGroupRoleMapping({ oidc_group: "devs", role_id: "old" })).rejects.toThrow(/not active/);
    dbMock.getRoleById.mockResolvedValue({ id: "member", status: "ACTIVE" });
    await oidc.UpsertOidcGroupRoleMapping({ oidc_group: " devs ", role_id: "member" });
    expect(dbMock.upsertOidcGroupRoleMapping).toHaveBeenCalledWith({ oidc_group: "devs", role_id: "member" });
  });

  it("DeleteOidcGroupRoleMapping requires a positive integer id and an existing row", async () => {
    await expect(oidc.DeleteOidcGroupRoleMapping(undefined)).rejects.toThrow(/Invalid mapping id/);
    await expect(oidc.DeleteOidcGroupRoleMapping("abc")).rejects.toThrow(/Invalid mapping id/);
    await expect(oidc.DeleteOidcGroupRoleMapping(0)).rejects.toThrow(/Invalid mapping id/);
    dbMock.deleteOidcGroupRoleMapping.mockResolvedValue(0);
    await expect(oidc.DeleteOidcGroupRoleMapping(5)).rejects.toThrow(/Mapping not found/);
    dbMock.deleteOidcGroupRoleMapping.mockResolvedValue(1);
    await oidc.DeleteOidcGroupRoleMapping("5");
    expect(dbMock.deleteOidcGroupRoleMapping).toHaveBeenCalledWith(5);
  });
});

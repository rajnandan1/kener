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
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  oidc.ClearOidcConfigCache();
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

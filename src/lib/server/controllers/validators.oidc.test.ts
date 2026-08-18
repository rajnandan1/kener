import { afterEach, describe, expect, it, vi } from "vitest";
import { IsValidOidcSettings } from "./validators";

const valid = {
  enabled: true,
  provider_name: "GitLab",
  issuer_url: "https://gitlab.example.com",
  client_id: "kener",
  client_secret: "s",
  scopes: "openid profile email",
  groups_claim: "groups",
  allow_local_login: true,
  auto_create_users: false,
  default_role_id: "member",
};
const json = (o: unknown) => JSON.stringify(o);

afterEach(() => vi.unstubAllEnvs());

describe("IsValidOidcSettings", () => {
  it("accepts a complete valid object and a disabled partial object", () => {
    expect(IsValidOidcSettings(json(valid))).toBe(true);
    expect(IsValidOidcSettings(json({ enabled: false }))).toBe(true);
    expect(IsValidOidcSettings(json({ enabled: false, issuer_url: "" }))).toBe(true);
  });

  it("rejects non-objects, unknown keys and wrong types", () => {
    expect(IsValidOidcSettings("not json")).toBe(false);
    expect(IsValidOidcSettings(json([]))).toBe(false);
    expect(IsValidOidcSettings(json({ ...valid, extra: 1 }))).toBe(false);
    expect(IsValidOidcSettings(json({ ...valid, enabled: "true" }))).toBe(false);
    expect(IsValidOidcSettings(json({ ...valid, scopes: 5 }))).toBe(false);
  });

  it("when enabled: requires an https issuer, a client_id and the openid scope", () => {
    expect(IsValidOidcSettings(json({ ...valid, issuer_url: "gitlab.example.com" }))).toBe(false);
    expect(IsValidOidcSettings(json({ ...valid, issuer_url: "http://idp.local" }))).toBe(false);
    expect(IsValidOidcSettings(json({ ...valid, client_id: " " }))).toBe(false);
    expect(IsValidOidcSettings(json({ ...valid, scopes: "profile email" }))).toBe(false);
    vi.stubEnv("KENER_OIDC_ALLOW_HTTP", "true");
    expect(IsValidOidcSettings(json({ ...valid, issuer_url: "http://idp.local" }))).toBe(true);
  });
});

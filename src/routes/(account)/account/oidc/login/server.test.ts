import { beforeEach, describe, expect, it, vi } from "vitest";

const controller = vi.hoisted(() => ({
  GetEffectiveOidcSettings: vi.fn(),
  BuildAuthorizationUrl: vi.fn(),
  GetOidcCallbackUrl: vi.fn(() => "https://status.example.com/account/oidc/callback"),
  OIDC_COOKIE_NAMES: { state: "oidc-state", nonce: "oidc-nonce", codeVerifier: "oidc-code-verifier" },
}));
vi.mock("$lib/server/controllers/oidcController", () => controller);

import { GET } from "./+server";

function makeEvent() {
  const jar = new Map<string, { value: string; opts: Record<string, unknown> }>();
  const cookies = {
    set: vi.fn((name: string, value: string, opts: Record<string, unknown>) => jar.set(name, { value, opts })),
    get: vi.fn((name: string) => jar.get(name)?.value),
    delete: vi.fn(),
  };
  return { event: { url: new URL("https://status.example.com/account/oidc/login"), cookies } as never, jar, cookies };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("ORIGIN", "https://status.example.com");
  vi.stubEnv("KENER_BASE_PATH", "");
  controller.GetEffectiveOidcSettings.mockResolvedValue({ settings: { enabled: true }, envLocked: new Set() });
  controller.BuildAuthorizationUrl.mockResolvedValue({
    url: "https://idp.example.com/auth?x=1",
    state: "st",
    nonce: "nn",
    codeVerifier: "cv",
  });
});

describe("GET /account/oidc/login", () => {
  it("404s when OIDC is disabled", async () => {
    controller.GetEffectiveOidcSettings.mockResolvedValue({ settings: { enabled: false }, envLocked: new Set() });
    await expect(GET(makeEvent().event)).rejects.toMatchObject({ status: 404 });
  });

  it("sets state/nonce/verifier cookies with strict flags and redirects to the IdP", async () => {
    const { event, jar } = makeEvent();
    await expect(GET(event)).rejects.toMatchObject({ status: 302, location: "https://idp.example.com/auth?x=1" });
    expect(controller.BuildAuthorizationUrl).toHaveBeenCalledWith(
      { enabled: true },
      "https://status.example.com/account/oidc/callback",
    );
    for (const [name, value] of [
      ["oidc-state", "st"],
      ["oidc-nonce", "nn"],
      ["oidc-code-verifier", "cv"],
    ]) {
      const cookie = jar.get(name);
      expect(cookie?.value).toBe(value);
      expect(cookie?.opts).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
    }
  });

  it("uses the base path for the cookie path and secure=false for http origins", async () => {
    vi.stubEnv("ORIGIN", "http://localhost:3000");
    vi.stubEnv("KENER_BASE_PATH", "/status");
    const { event, jar } = makeEvent();
    await expect(GET(event)).rejects.toMatchObject({ status: 302 });
    expect(jar.get("oidc-state")?.opts).toMatchObject({ path: "/status", secure: false });
  });

  it("returns 500 (not a redirect) when building the URL fails", async () => {
    controller.BuildAuthorizationUrl.mockRejectedValue(new Error("discovery down"));
    const { event, cookies } = makeEvent();
    await expect(GET(event)).rejects.toMatchObject({ status: 500 });
    expect(cookies.set).not.toHaveBeenCalled();
  });
});

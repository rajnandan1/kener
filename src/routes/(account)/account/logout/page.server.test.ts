import { beforeEach, describe, expect, it, vi } from "vitest";

const controller = vi.hoisted(() => ({
  OIDC_COOKIE_NAMES: {
    state: "oidc-state",
    nonce: "oidc-nonce",
    codeVerifier: "oidc-code-verifier",
    reauth: "oidc-reauth",
  },
}));
vi.mock("$lib/server/controllers/oidcController", () => controller);

import { actions } from "./+page.server";

function makeEvent() {
  const cookies = { set: vi.fn(), delete: vi.fn(), get: vi.fn() };
  return { event: { cookies } as never, cookies };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("ORIGIN", "https://status.example.com");
  vi.stubEnv("KENER_BASE_PATH", "");
});

describe("POST /account/logout", () => {
  it("clears the session and marks the next OIDC sign-in to re-authenticate, then redirects to sign-in", async () => {
    const { event, cookies } = makeEvent();
    await expect(actions.default(event)).rejects.toMatchObject({ status: 302, location: "/account/signin" });
    expect(cookies.delete).toHaveBeenCalledWith("kener-user", { path: "/" });
    expect(cookies.set).toHaveBeenCalledWith(
      "oidc-reauth",
      "1",
      expect.objectContaining({ path: "/", httpOnly: true, secure: true, sameSite: "lax" }),
    );
    // Session-scoped: no maxAge — it lives until consumed by /account/oidc/login or the browser closes.
    const opts = cookies.set.mock.calls[0][2] as Record<string, unknown>;
    expect(opts.maxAge).toBeUndefined();
  });

  it("uses the base path and secure=false for http origins", async () => {
    vi.stubEnv("ORIGIN", "http://localhost:3000");
    vi.stubEnv("KENER_BASE_PATH", "/status");
    const { event, cookies } = makeEvent();
    await expect(actions.default(event)).rejects.toMatchObject({ status: 302, location: "/status/account/signin" });
    expect(cookies.set).toHaveBeenCalledWith(
      "oidc-reauth",
      "1",
      expect.objectContaining({ path: "/status", secure: false }),
    );
  });
});

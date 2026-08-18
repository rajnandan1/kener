import { beforeEach, describe, expect, it, vi } from "vitest";

const controller = vi.hoisted(() => ({
  GetEffectiveOidcSettings: vi.fn(),
  HandleCallback: vi.fn(),
  FindOrCreateOidcUser: vi.fn(),
  GetOidcCallbackUrl: vi.fn(() => "https://status.example.com/account/oidc/callback"),
  OIDC_COOKIE_NAMES: { state: "oidc-state", nonce: "oidc-nonce", codeVerifier: "oidc-code-verifier" },
  OidcAuthError: class extends Error {
    code: string;
    constructor(code: string, detail?: string) {
      super(detail ?? code);
      this.code = code;
    }
  },
}));
vi.mock("$lib/server/controllers/oidcController", () => controller);
const common = vi.hoisted(() => ({
  GenerateToken: vi.fn(async () => "jwt-token"),
  CookieConfig: vi.fn(() => ({
    name: "kener-user",
    path: "/",
    maxAge: 100,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
  })),
}));
vi.mock("$lib/server/controllers/commonController", () => common);

import { GET } from "./+server";

function makeEvent(query = "?code=abc&state=st", withCookies = true) {
  const jar = new Map<string, string>(
    withCookies
      ? [
          ["oidc-state", "st"],
          ["oidc-nonce", "nn"],
          ["oidc-code-verifier", "cv"],
        ]
      : [],
  );
  const cookies = {
    get: vi.fn((name: string) => jar.get(name)),
    delete: vi.fn((name: string) => jar.delete(name)),
    set: vi.fn(),
  };
  return {
    event: { url: new URL(`https://status.example.com/account/oidc/callback${query}`), cookies } as never,
    cookies,
  };
}
const activeUser = { id: 1, is_active: 1, role_ids: ["member"], email: "u@example.com" };

/** GET always throws (redirect/error); await the rejection and pull its `location`. */
async function locationOf(event: Parameters<typeof GET>[0]): Promise<string> {
  try {
    await GET(event);
    throw new Error("expected GET to throw a redirect");
  } catch (e) {
    return (e as { location: string }).location;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("KENER_BASE_PATH", "");
  controller.GetEffectiveOidcSettings.mockResolvedValue({ settings: { enabled: true }, envLocked: new Set() });
  controller.HandleCallback.mockResolvedValue({ sub: "s", email: "u@example.com", name: "U", groups: [] });
  controller.FindOrCreateOidcUser.mockResolvedValue(activeUser);
});

const redirectTo = (code: string) => ({ status: 302, location: `/account/signin?oidc_error=${code}` });

describe("GET /account/oidc/callback", () => {
  it("404s when OIDC is disabled", async () => {
    controller.GetEffectiveOidcSettings.mockResolvedValue({ settings: { enabled: false }, envLocked: new Set() });
    await expect(GET(makeEvent().event)).rejects.toMatchObject({ status: 404 });
  });

  it("maps a provider error to the provider_error code without reflecting its text", async () => {
    const { event } = makeEvent("?error=access_denied&error_description=<script>alert(1)</script>");
    await expect(GET(event)).rejects.toMatchObject(redirectTo("provider_error"));
    const location = await locationOf(event);
    expect(location).not.toContain("script");
  });

  it("clears the cookies and reports session_expired when they are missing", async () => {
    const { event, cookies } = makeEvent("?code=abc&state=st", false);
    await expect(GET(event)).rejects.toMatchObject(redirectTo("session_expired"));
    expect(cookies.delete).toHaveBeenCalledTimes(3);
    expect(controller.HandleCallback).not.toHaveBeenCalled();
  });

  it("on success clears OIDC cookies, sets the session cookie and redirects to the dashboard", async () => {
    const { event, cookies } = makeEvent();
    await expect(GET(event)).rejects.toMatchObject({ status: 302, location: "/manage/app/site-configurations" });
    expect(controller.HandleCallback).toHaveBeenCalledWith(
      { enabled: true },
      "https://status.example.com/account/oidc/callback",
      expect.any(URL),
      "st",
      "nn",
      "cv",
    );
    expect(cookies.delete).toHaveBeenCalledTimes(3);
    expect(common.GenerateToken).toHaveBeenCalledWith(activeUser);
    expect(cookies.set).toHaveBeenCalledWith(
      "kener-user",
      "jwt-token",
      expect.objectContaining({ httpOnly: true, path: "/" }),
    );
  });

  it("maps OidcAuthError codes and unknown errors to codes, never messages", async () => {
    controller.FindOrCreateOidcUser.mockRejectedValue(
      new controller.OidcAuthError("not_provisioned", "email x taken by user 3"),
    );
    await expect(GET(makeEvent().event)).rejects.toMatchObject(redirectTo("not_provisioned"));
    controller.HandleCallback.mockRejectedValue(new Error("invalid_grant: PKCE verification failed"));
    const location = await locationOf(makeEvent().event);
    expect(location).toBe("/account/signin?oidc_error=auth_failed");
    expect(location).not.toContain("PKCE");
  });

  it("rejects deactivated users and users without roles", async () => {
    controller.FindOrCreateOidcUser.mockResolvedValue({ ...activeUser, is_active: 0 });
    await expect(GET(makeEvent().event)).rejects.toMatchObject(redirectTo("deactivated"));
    controller.FindOrCreateOidcUser.mockResolvedValue({ ...activeUser, role_ids: [] });
    await expect(GET(makeEvent().event)).rejects.toMatchObject(redirectTo("no_roles"));
    expect(common.GenerateToken).not.toHaveBeenCalled();
  });

  it("honours KENER_BASE_PATH in redirects and cookie deletion", async () => {
    vi.stubEnv("KENER_BASE_PATH", "/status");
    const { event, cookies } = makeEvent();
    await expect(GET(event)).rejects.toMatchObject({ status: 302, location: "/status/manage/app/site-configurations" });
    expect(cookies.delete).toHaveBeenCalledWith("oidc-state", { path: "/status" });
  });
});

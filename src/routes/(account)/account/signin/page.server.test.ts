import { beforeEach, describe, expect, it, vi } from "vitest";

const users = vi.hoisted(() => ({
  GetUserByEmail: vi.fn(),
  GetUsersCount: vi.fn(async () => ({ count: 1 })),
  GetUserPasswordHashById: vi.fn(async () => ({ password_hash: "hash" })),
  CreateFirstUser: vi.fn(),
}));
vi.mock("$lib/server/controllers/userController", () => users);
const common = vi.hoisted(() => ({
  VerifyPassword: vi.fn(async () => true),
  HashPassword: vi.fn(async () => "dummy-hash"),
  GenerateToken: vi.fn(async () => "jwt"),
  CookieConfig: vi.fn(() => ({
    name: "kener-user",
    path: "/",
    maxAge: 1,
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  })),
}));
vi.mock("$lib/server/controllers/commonController", () => common);
const oidc = vi.hoisted(() => ({ GetOidcPublicState: vi.fn() }));
vi.mock("$lib/server/controllers/oidcController", () => oidc);

import { actions, load } from "./+page.server";
import GC from "$lib/global-constants";

const owner = {
  id: 1,
  email: "owner@example.com",
  is_owner: "YES",
  is_active: 1,
  role_ids: ["admin"],
  auth_provider: "local",
};
const member = {
  id: 2,
  email: "m@example.com",
  is_owner: "NO",
  is_active: 1,
  role_ids: ["member"],
  auth_provider: "local",
};
const oidcUser = {
  id: 3,
  email: "o@example.com",
  is_owner: "NO",
  is_active: 1,
  role_ids: ["member"],
  auth_provider: "oidc",
};

function loginEvent(email: string, password = "Password1") {
  const form = new FormData();
  form.set("email", email);
  form.set("password", password);
  const request = new Request("https://status.example.com/account/signin?/login", { method: "POST", body: form });
  return { request, cookies: { set: vi.fn() } } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  oidc.GetOidcPublicState.mockResolvedValue({ enabled: true, providerName: "GitLab", allowLocalLogin: false });
  users.GetUserByEmail.mockImplementation(
    async (email: string) => ({ [owner.email]: owner, [member.email]: member, [oidcUser.email]: oidcUser })[email],
  );
});

describe("load", () => {
  const parent = async () => ({ loggedInUser: null, isSetupComplete: true });
  it("exposes the public OIDC state and maps error codes to fixed messages", async () => {
    const data = await load({ parent, url: new URL("https://x/account/signin?oidc_error=not_provisioned") } as never);
    expect(data.oidc).toEqual({ enabled: true, providerName: "GitLab", allowLocalLogin: false });
    expect(data.oidcError).toBe(GC.OIDC_ERROR_MESSAGES.not_provisioned);
  });
  it("uses the generic message for unknown codes and null when absent", async () => {
    expect(
      (await load({ parent, url: new URL("https://x/account/signin?oidc_error=<b>x</b>") } as never)).oidcError,
    ).toBe(GC.OIDC_ERROR_MESSAGES.auth_failed);
    expect((await load({ parent, url: new URL("https://x/account/signin") } as never)).oidcError).toBeNull();
  });
});

describe("actions.login with local login disabled", () => {
  it("answers an unknown email, a non-owner and the owner with a wrong password identically (no enumeration)", async () => {
    type R = { status: number; data: { error: string } };
    const unknown = (await actions.login(loginEvent("nobody@example.com"))) as R;
    const known = (await actions.login(loginEvent(member.email))) as R;
    common.VerifyPassword.mockResolvedValueOnce(false);
    const ownerWrong = (await actions.login(loginEvent(owner.email, "nope"))) as R;
    // Same status and message for all three — the owner account must not be identifiable either.
    expect([unknown.status, known.status, ownerWrong.status]).toEqual([401, 401, 401]);
    expect(unknown.data.error).toBe("Invalid password or Email");
    expect(known.data.error).toBe(unknown.data.error);
    expect(ownerWrong.data.error).toBe(unknown.data.error);
    // ...and the same work: exactly one bcrypt compare each (the owner's against the real hash).
    expect(common.VerifyPassword.mock.calls).toEqual([
      ["Password1", "dummy-hash"],
      ["Password1", "dummy-hash"],
      ["nope", "hash"],
    ]);
  });

  it("still lets the owner sign in with a password (break-glass)", async () => {
    await expect(actions.login(loginEvent(owner.email))).rejects.toMatchObject({ status: 302 });
    expect(common.GenerateToken).toHaveBeenCalledWith(owner);
  });
});

describe("actions.login with local login allowed", () => {
  beforeEach(() =>
    oidc.GetOidcPublicState.mockResolvedValue({ enabled: true, providerName: "GitLab", allowLocalLogin: true }),
  );

  it("signs a local member in", async () => {
    await expect(actions.login(loginEvent(member.email))).rejects.toMatchObject({ status: 302 });
  });

  it("answers an unknown email exactly like a wrong password (no account enumeration)", async () => {
    common.VerifyPassword.mockResolvedValueOnce(false);
    const wrongPassword = (await actions.login(loginEvent(member.email, "nope"))) as {
      status: number;
      data: { error: string };
    };
    const unknown = (await actions.login(loginEvent("nobody@example.com"))) as {
      status: number;
      data: { error: string };
    };
    expect(wrongPassword.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(unknown.data.error).toBe(wrongPassword.data.error);
    expect(unknown.data.error).not.toMatch(/exist/i);
    // ...and the same amount of work: the unknown email still costs one bcrypt compare (timing side channel).
    expect(common.VerifyPassword).toHaveBeenCalledTimes(2);
    expect(common.VerifyPassword).toHaveBeenLastCalledWith("Password1", "dummy-hash");
  });

  it("gives a local account with an empty password hash the generic invalid-credentials response", async () => {
    // Covers the `!passwordStored.password_hash` guard: a local row with no usable hash
    // must neither authenticate nor reveal why.
    users.GetUserPasswordHashById.mockResolvedValueOnce({ password_hash: "" });
    const result = (await actions.login(loginEvent(member.email))) as { status: number; data: { error: string } };
    expect(result.status).toBe(401);
    expect(result.data.error).toBe("Invalid password or Email");
    expect(result.data.error).not.toMatch(/SSO/);
    expect(common.VerifyPassword.mock.calls).toEqual([["Password1", "dummy-hash"]]); // never against ""
  });

  it("refuses an OIDC account with a password before even looking at a hash", async () => {
    const result = (await actions.login(loginEvent(oidcUser.email))) as { status: number; data: { error: string } };
    expect(result.status).toBe(401);
    expect(result.data.error).toBe("Invalid password or Email");
    expect(users.GetUserPasswordHashById).not.toHaveBeenCalled();
    expect(common.VerifyPassword.mock.calls).toEqual([["Password1", "dummy-hash"]]); // timing-equalized only
  });

  it("computes the dummy hash at most once per process", async () => {
    await actions.login(loginEvent("nobody@example.com"));
    await actions.login(loginEvent("nobody2@example.com"));
    expect(common.VerifyPassword).toHaveBeenCalledTimes(2);
    expect(common.HashPassword.mock.calls.length).toBeLessThanOrEqual(1); // memoized (maybe already by an earlier test)
  });
});

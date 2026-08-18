import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  getUserByEmail: vi.fn(),
  updateUserPassword: vi.fn(async () => 1),
  updateUserIsActive: vi.fn(async () => 1),
  updateIsVerified: vi.fn(async () => 1),
}));
vi.mock("$lib/server/db/db", () => ({ default: dbMock }));
const common = vi.hoisted(() => ({
  HashPassword: vi.fn(async () => "hashed"),
  ValidatePassword: vi.fn(() => true),
  VerifyToken: vi.fn(async () => ({ email: "o@example.com", validTill: Date.now() + 3600000 })),
}));
vi.mock("$lib/server/controllers/commonController.js", () => common);
const userController = vi.hoisted(() => ({
  GetUserPasswordHashById: vi.fn(async () => ({ password_hash: "" })),
}));
vi.mock("$lib/server/controllers/userController.js", () => userController);

import { POST as acceptPOST } from "./accept-invitation/+server";

const jsonRequest = (body: unknown) =>
  ({
    request: new Request("https://x/api", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
  }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("accept-invitation for an OIDC account", () => {
  it("rejects with 400 and does not touch the password", async () => {
    dbMock.getUserByEmail.mockResolvedValue({ id: 3, email: "o@example.com", auth_provider: "oidc" });
    const res = await acceptPOST(jsonRequest({ receivedToken: "t", newPassword: "Password1" }));
    expect(res.status).toBe(400);
    expect(dbMock.updateUserPassword).not.toHaveBeenCalled();
  });

  it("still accepts an invitation for a local account with an empty hash", async () => {
    dbMock.getUserByEmail.mockResolvedValue({ id: 2, email: "l@example.com", auth_provider: "local" });
    const res = await acceptPOST(jsonRequest({ receivedToken: "t", newPassword: "Password1" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(dbMock.updateUserPassword).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
  });
});

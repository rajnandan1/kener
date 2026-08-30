import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  getUserByEmail: vi.fn(),
  updateUserPassword: vi.fn(async () => 1),
  updateIsVerified: vi.fn(async () => 1),
}));
vi.mock("$lib/server/db/db", () => ({ default: dbMock }));
const controller = vi.hoisted(() => ({
  HashPassword: vi.fn(async () => "hashed"),
  GenerateToken: vi.fn(async () => "token"),
  VerifyToken: vi.fn(async () => ({ email: "o@example.com", generatedAt: Date.now() })),
  GetAllSiteData: vi.fn(async () => ({})),
  ValidatePassword: vi.fn(() => true),
}));
vi.mock("$lib/server/controllers/controller.js", () => controller);
vi.mock("$lib/server/controllers/generalTemplateController", () => ({
  GetGeneralEmailTemplateById: vi.fn(async () => ({
    template_html_body: "x",
    template_subject: "s",
    template_text_body: "t",
  })),
}));
vi.mock("$lib/server/notification/notification_utils", () => ({
  siteDataToVariables: vi.fn(() => ({ site_url: "https://x/" })),
}));
const sendEmail = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("$lib/server/notification/email_notification.js", () => ({ default: sendEmail }));

import { POST as forgotPOST } from "./fogot-password/+server";
import { POST as resetPOST } from "./password-reset/+server";

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

describe("forgot-password for an OIDC account", () => {
  it("answers success without sending an email", async () => {
    dbMock.getUserByEmail.mockResolvedValue({ id: 3, email: "o@example.com", auth_provider: "oidc" });
    const res = await forgotPOST(jsonRequest({ email: "o@example.com" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(controller.GenerateToken).not.toHaveBeenCalled(); // no reset token is ever minted for an OIDC account
  });
  it("still emails local accounts", async () => {
    dbMock.getUserByEmail.mockResolvedValue({ id: 2, email: "l@example.com", auth_provider: "local" });
    const res = await forgotPOST(jsonRequest({ email: "l@example.com" }));
    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalled();
  });
});

describe("password-reset for an OIDC account", () => {
  it("rejects with 400 and does not touch the password", async () => {
    dbMock.getUserByEmail.mockResolvedValue({ id: 3, email: "o@example.com", auth_provider: "oidc" });
    const res = await resetPOST(jsonRequest({ receivedToken: "t", newPassword: "Password1" }));
    expect(res.status).toBe(400);
    expect(dbMock.updateUserPassword).not.toHaveBeenCalled();
  });
});

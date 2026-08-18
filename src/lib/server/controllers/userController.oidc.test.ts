import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  getUserById: vi.fn(),
  updateUserPassword: vi.fn(async () => 1),
  getUserByEmail: vi.fn(),
  getUserPasswordHashById: vi.fn(),
}));
vi.mock("$lib/server/db/db", () => ({ default: dbMock }));
vi.mock("./controller.js", () => ({ GetAllSiteData: vi.fn(async () => ({})) }));
vi.mock("../notification/notification_utils.js", () => ({
  siteDataToVariables: vi.fn(() => ({ site_url: "https://x/" })),
}));
const sendEmail = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("../notification/email_notification.js", () => ({ default: sendEmail }));
vi.mock("./generalTemplateController.js", () => ({
  GetGeneralEmailTemplateById: vi.fn(async () => ({
    template_html_body: "x",
    template_subject: "s",
    template_text_body: "t",
  })),
}));

import { ResendInvitationEmail, UpdatePassword } from "./userController";

beforeEach(() => vi.clearAllMocks());

describe("UpdatePassword", () => {
  it("refuses to set a password on an OIDC account", async () => {
    dbMock.getUserById.mockResolvedValue({ id: 3, auth_provider: "oidc" });
    await expect(
      UpdatePassword({ userID: 3, newPassword: "Password1", newPlainPassword: "Password1" }),
    ).rejects.toThrow(/signs in via SSO/);
    expect(dbMock.updateUserPassword).not.toHaveBeenCalled();
  });

  it("still updates local accounts", async () => {
    dbMock.getUserById.mockResolvedValue({ id: 2, auth_provider: "local" });
    await UpdatePassword({ userID: 2, newPassword: "Password1", newPlainPassword: "Password1" });
    expect(dbMock.updateUserPassword).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
  });
});

describe("ResendInvitationEmail", () => {
  it("refuses to invite an OIDC account", async () => {
    dbMock.getUserByEmail.mockResolvedValue({ id: 3, email: "o@example.com", auth_provider: "oidc" });
    dbMock.getUserPasswordHashById.mockResolvedValue({ password_hash: "" });
    await expect(ResendInvitationEmail("o@example.com")).rejects.toThrow(/SSO/);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("still invites local accounts", async () => {
    dbMock.getUserByEmail.mockResolvedValue({ id: 2, email: "l@example.com", auth_provider: "local" });
    dbMock.getUserPasswordHashById.mockResolvedValue({ password_hash: "" });
    await expect(ResendInvitationEmail("l@example.com")).resolves.toBeUndefined();
    expect(sendEmail).toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  getUserById: vi.fn(),
  updateUserPassword: vi.fn(async () => 1),
}));
vi.mock("$lib/server/db/db", () => ({ default: dbMock }));
vi.mock("./controller.js", () => ({ GetAllSiteData: vi.fn() }));
vi.mock("../notification/notification_utils.js", () => ({ siteDataToVariables: vi.fn() }));
vi.mock("../notification/email_notification.js", () => ({ default: vi.fn() }));
vi.mock("./generalTemplateController.js", () => ({ GetGeneralEmailTemplateById: vi.fn() }));

import { UpdatePassword } from "./userController";

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

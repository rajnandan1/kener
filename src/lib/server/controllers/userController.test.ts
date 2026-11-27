import { describe, expect, it, vi } from "vitest";

vi.mock("../db/db.js", () => ({ default: { insertUser: vi.fn(async () => [1]) } }));
vi.mock("./controller.js", () => ({ GetAllSiteData: vi.fn() }));
vi.mock("../notification/notification_utils.js", () => ({ siteDataToVariables: vi.fn() }));
vi.mock("../notification/email_notification.js", () => ({ default: vi.fn() }));
vi.mock("./generalTemplateController.js", () => ({ GetGeneralEmailTemplateById: vi.fn() }));
vi.mock("./commonController.js", () => ({
  GenerateToken: vi.fn(),
  HashPassword: vi.fn(async () => "hash"),
  ValidatePassword: vi.fn(() => true),
  VerifyToken: vi.fn(),
}));

import { CreateFirstUser } from "./userController.js";

const create = (email: string) => CreateFirstUser({ email, name: "Admin User", password: "Passw0rd!" });

describe("validateEmailOrThrow (via CreateFirstUser)", () => {
  it("accepts a normal email", async () => {
    await expect(create("user@example.com")).resolves.toEqual([1]);
  });

  it("does not reject an address of exactly 254 characters on length", async () => {
    const email = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(61)}`;
    expect(email).toHaveLength(254);
    await expect(create(email)).resolves.toEqual([1]);
  });

  it("rejects an address longer than 254 characters", async () => {
    const email = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(62)}`;
    expect(email).toHaveLength(255);
    await expect(create(email)).rejects.toThrow(/valid email/);
  });

  it("rejects a 50k-dot email quickly instead of running the quadratic regex", async () => {
    const email = "a@" + ".".repeat(50_000) + "@";
    const start = performance.now();
    await expect(create(email)).rejects.toThrow(/valid email/);
    expect(performance.now() - start).toBeLessThan(100);
  });
});

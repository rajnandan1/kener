import { beforeEach, describe, expect, it, vi } from "vitest";

const { db } = vi.hoisted(() => ({
  db: { getSiteDataByKey: vi.fn(), insertOrUpdateSiteData: vi.fn() },
}));
vi.mock("../db/db.js", () => ({ default: db }));

import { InsertKeyValue, MaskSiteDataSecret } from "./siteDataController.js";

const captcha = (secret?: string) => ({
  isEnabled: true,
  requirements: { "Site Key": "site-key", ...(secret === undefined ? {} : { "Secret Key": secret }) },
});

describe("MaskSiteDataSecret", () => {
  it("masks the OIDC client secret", () => {
    expect(MaskSiteDataSecret("oidcSettings", { client_id: "id", client_secret: "super-secret" })).toEqual({
      client_id: "id",
      client_secret: "********cret",
    });
  });

  it("masks the captcha secret key and keeps the site key", () => {
    expect(MaskSiteDataSecret("captcha.turnstile", captcha("0x4AAAsecret"))).toEqual(captcha("********cret"));
  });

  it("leaves other keys and empty secrets unchanged", () => {
    expect(MaskSiteDataSecret("siteName", "Kener")).toBe("Kener");
    expect(MaskSiteDataSecret("oidcSettings", { client_secret: "" })).toEqual({ client_secret: "" });
  });
});

describe("InsertKeyValue", () => {
  const stored = (key: string, value: unknown) =>
    db.getSiteDataByKey.mockResolvedValue({ key, value: JSON.stringify(value), data_type: "object" });
  const written = () => JSON.parse(db.insertOrUpdateSiteData.mock.calls[0][1]);

  beforeEach(() => {
    db.getSiteDataByKey.mockReset();
    db.insertOrUpdateSiteData.mockReset();
  });

  it("keeps the stored secret when the masked secret comes back", async () => {
    stored("captcha.hcaptcha", captcha("real-secret"));
    const masked = MaskSiteDataSecret("captcha.hcaptcha", captcha("real-secret"));
    await InsertKeyValue("captcha.hcaptcha", JSON.stringify(masked));
    expect(written()).toEqual(captcha("real-secret"));
  });

  it("keeps the stored secret when a form loaded before a rotation sends the old mask", async () => {
    const oldMask = MaskSiteDataSecret("captcha.hcaptcha", captcha("old-secret"));
    stored("captcha.hcaptcha", captcha("rotated-secret"));
    await InsertKeyValue("captcha.hcaptcha", JSON.stringify(oldMask));
    expect(written()).toEqual(captcha("rotated-secret"));
  });

  it("keeps the stored OIDC secret when the save leaves it out", async () => {
    stored("oidcSettings", { client_id: "id", client_secret: "real-secret" });
    await InsertKeyValue("oidcSettings", JSON.stringify({ client_id: "new-id" }));
    expect(written()).toEqual({ client_id: "new-id", client_secret: "real-secret" });
  });

  it("saves a new secret and clears on an empty string", async () => {
    stored("oidcSettings", { client_secret: "real-secret" });
    await InsertKeyValue("oidcSettings", JSON.stringify({ client_secret: "rotated" }));
    await InsertKeyValue("oidcSettings", JSON.stringify({ client_secret: "" }));
    expect(written()).toEqual({ client_secret: "rotated" });
    expect(JSON.parse(db.insertOrUpdateSiteData.mock.calls[1][1])).toEqual({ client_secret: "" });
  });
});

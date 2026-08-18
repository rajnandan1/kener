import { beforeEach, describe, expect, it, vi } from "vitest";

const oidcController = vi.hoisted(() => ({
  MaskOidcSettings: vi.fn((settings: Record<string, unknown>) => {
    const { client_secret, ...rest } = settings;
    return { ...rest, client_secret: "", has_client_secret: !!client_secret };
  }),
}));
vi.mock("./oidcController.js", () => oidcController);

import { SanitizeSiteData, SanitizeSiteDataValue } from "./siteDataSanitizer";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SanitizeSiteDataValue", () => {
  it("masks oidcSettings via MaskOidcSettings and reports whether a secret is stored", () => {
    const value = SanitizeSiteDataValue("oidcSettings", {
      client_id: "kener",
      client_secret: "s3cret-value",
    }) as Record<string, unknown>;
    expect(value.client_secret).toBe("");
    expect(value.has_client_secret).toBe(true);
    expect(oidcController.MaskOidcSettings).toHaveBeenCalledTimes(1);
  });

  it("leaves other keys untouched", () => {
    expect(SanitizeSiteDataValue("siteName", "Kener")).toBe("Kener");
    expect(SanitizeSiteDataValue("colors", { UP: "green" })).toEqual({ UP: "green" });
  });

  it("passes through a missing/non-object oidcSettings value unchanged", () => {
    expect(SanitizeSiteDataValue("oidcSettings", undefined)).toBeUndefined();
    expect(SanitizeSiteDataValue("oidcSettings", "")).toBe("");
  });
});

describe("SanitizeSiteData", () => {
  it("masks oidcSettings in a parsed site-data object and copies other keys as-is", () => {
    const input = {
      siteName: "Kener",
      oidcSettings: { client_id: "kener", client_secret: "s3cret-value" },
    };
    const result = SanitizeSiteData(input);
    expect(result.siteName).toBe("Kener");
    expect((result.oidcSettings as Record<string, unknown>).client_secret).toBe("");
    expect((result.oidcSettings as Record<string, unknown>).has_client_secret).toBe(true);
    // original object is not mutated
    expect(input.oidcSettings.client_secret).toBe("s3cret-value");
  });

  it("is a no-op when the key is not present", () => {
    const input = { siteName: "Kener" };
    expect(SanitizeSiteData(input)).toEqual({ siteName: "Kener" });
  });
});

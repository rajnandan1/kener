import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  getAllSiteData: vi.fn(),
}));
vi.mock("$lib/server/db/db", () => ({ default: dbMock }));

import { GET } from "./+server";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/v4/site", () => {
  it("never leaks the OIDC client secret and masks the oidcSettings row", async () => {
    dbMock.getAllSiteData.mockResolvedValue([
      {
        key: "oidcSettings",
        value: JSON.stringify({
          enabled: true,
          client_id: "kener",
          client_secret: "s3cret-value",
        }),
        data_type: "object",
      },
      {
        key: "siteName",
        value: "Kener",
        data_type: "string",
      },
    ]);

    const response = await GET({} as never);
    const body = (await response.json()) as { site_data: { key: string; value: unknown; data_type: string }[] };
    const raw = JSON.stringify(body);

    expect(raw).not.toContain("s3cret-value");

    const oidcItem = body.site_data.find((item) => item.key === "oidcSettings");
    expect(oidcItem).toBeDefined();
    const oidcValue = oidcItem?.value as Record<string, unknown>;
    expect(oidcValue.has_client_secret).toBe(true);
    expect(oidcValue.client_id).toBe("kener");

    const plainItem = body.site_data.find((item) => item.key === "siteName");
    expect(plainItem).toEqual({ key: "siteName", value: "Kener", data_type: "string" });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  getSiteDataByKey: vi.fn(),
  insertOrUpdateSiteData: vi.fn(),
}));
vi.mock("$lib/server/db/db", () => ({ default: dbMock }));

import { GET, PATCH } from "./+server";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/v4/site/x", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/v4/site/[config_key]", () => {
  it("never leaks the OIDC client secret and reports has_client_secret for oidcSettings", async () => {
    dbMock.getSiteDataByKey.mockResolvedValue({
      key: "oidcSettings",
      value: JSON.stringify({
        enabled: true,
        client_id: "kener",
        client_secret: "s3cret-value",
      }),
      data_type: "object",
    });

    const response = await GET({ params: { config_key: "oidcSettings" } } as never);
    const body = (await response.json()) as { key: string; value: Record<string, unknown>; data_type: string };
    const raw = JSON.stringify(body);

    expect(raw).not.toContain("s3cret-value");
    expect(body.value.has_client_secret).toBe(true);
    expect(body.value.client_id).toBe("kener");
  });

  it("returns other config keys unchanged", async () => {
    dbMock.getSiteDataByKey.mockResolvedValue({
      key: "siteName",
      value: "Kener",
      data_type: "string",
    });

    const response = await GET({ params: { config_key: "siteName" } } as never);
    const body = await response.json();

    expect(body).toEqual({ key: "siteName", value: "Kener", data_type: "string" });
  });
});

describe("PATCH /api/v4/site/[config_key]", () => {
  it("refuses to update oidcSettings and does not touch the database", async () => {
    const response = await PATCH({
      params: { config_key: "oidcSettings" },
      request: jsonRequest({ value: { enabled: true } }),
    } as never);

    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("FORBIDDEN");
    expect(dbMock.insertOrUpdateSiteData).not.toHaveBeenCalled();
  });

  it("still updates a plain, writable config key", async () => {
    dbMock.insertOrUpdateSiteData.mockResolvedValue(undefined);

    const response = await PATCH({
      params: { config_key: "siteName" },
      request: jsonRequest({ value: "New Site Name" }),
    } as never);

    expect(response.status).toBe(200);
    expect(dbMock.insertOrUpdateSiteData).toHaveBeenCalledWith("siteName", "New Site Name", "string");
    const body = await response.json();
    expect(body).toEqual({ key: "siteName", value: "New Site Name", data_type: "string" });
  });
});

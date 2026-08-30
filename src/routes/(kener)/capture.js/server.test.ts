import { describe, it, expect, vi } from "vitest";

vi.mock("$lib/server/controllers/siteDataController.js", () => ({
  GetAllAnalyticsData: vi.fn(),
}));

import { GetAllAnalyticsData } from "$lib/server/controllers/siteDataController.js";
import { GET } from "./+server";

const call = () => GET({} as Parameters<typeof GET>[0]);

function enable(key: string, requirements: Record<string, string>) {
  vi.mocked(GetAllAnalyticsData).mockResolvedValue([{ key, value: { isEnabled: true, requirements } }]);
}

describe("GET /capture.js — OpenPanel", () => {
  it("substitutes every placeholder from the saved requirements", async () => {
    enable("analytics.openpanel", {
      "Client ID": "cid-123",
      "API URL": "https://op.example.com/api",
      "Script URL": "https://op.example.com/op1.js",
    });
    const res = await call();
    const body = await res.text();
    expect(res.headers.get("Content-Type")).toBe("application/javascript");
    expect(body).toContain('clientId: "cid-123"');
    expect(body).toContain('apiUrl: "https://op.example.com/api"');
    expect(body).toContain('"https://op.example.com/op1.js"');
    expect(body).toContain('window.op("track", eventName, eventData)');
    expect(body).not.toContain("{{");
  });

  it("emits nothing for OpenPanel when it is disabled", async () => {
    vi.mocked(GetAllAnalyticsData).mockResolvedValue([
      { key: "analytics.openpanel", value: { isEnabled: false, requirements: { "Client ID": "cid-123" } } },
    ]);
    const body = await (await call()).text();
    expect(body).toBe("//no data");
  });
});

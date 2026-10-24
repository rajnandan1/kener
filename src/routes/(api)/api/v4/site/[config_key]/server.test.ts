import { describe, expect, it, vi } from "vitest";

const { db } = vi.hoisted(() => {
  const rows = new Map<string, string>();
  return {
    db: {
      getSiteDataByKey: vi.fn(async (key: string) =>
        rows.has(key) ? { key, value: rows.get(key), data_type: "object" } : undefined,
      ),
      insertOrUpdateSiteData: vi.fn(async (key: string, value: string) => {
        rows.set(key, value);
        return [1];
      }),
      getAllSiteDataByPrefix: vi.fn(async (prefix: string) =>
        [...rows].filter(([key]) => key.startsWith(prefix)).map(([key, value]) => ({ key, value })),
      ),
    },
  };
});
vi.mock("$lib/server/db/db", () => ({ default: db }));

import { GetPublicCaptchaConfig, VerifyCaptchaToken } from "$lib/server/controllers/captchaController";
import { PATCH } from "./+server";

describe("PATCH /api/v4/site/{config_key}", () => {
  it("returns the saved value with the kept secret masked when the body leaves the secret out", async () => {
    await db.insertOrUpdateSiteData("oidcSettings", JSON.stringify({ client_id: "id", client_secret: "real-secret" }));

    const request = new Request("http://localhost/api/v4/site/oidcSettings", {
      method: "PATCH",
      body: JSON.stringify({ value: { client_id: "new-id" } }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await PATCH({ params: { config_key: "oidcSettings" }, request } as any);

    expect((await response.json()).value).toEqual({ client_id: "new-id", client_secret: "*******cret" });
    expect(JSON.parse((await db.getSiteDataByKey("oidcSettings"))!.value!)).toEqual({
      client_id: "new-id",
      client_secret: "real-secret",
    });
  });

  it("saves no secret when the masked secret from another instance arrives, so captcha fails closed", async () => {
    const fetch = vi.fn(async () => Response.json({ success: false }));
    vi.stubGlobal("fetch", fetch);
    const value = { isEnabled: true, requirements: { "Site Key": "site-key", "Secret Key": "********cret" } };

    const request = new Request("http://localhost/api/v4/site/captcha.turnstile", {
      method: "PATCH",
      body: JSON.stringify({ value }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await PATCH({ params: { config_key: "captcha.turnstile" }, request } as any);

    expect.soft((await response.text()).match(/\*/g) ?? []).toHaveLength(0);
    expect.soft(await GetPublicCaptchaConfig()).toEqual({ provider: null, siteKey: null, misconfigured: true });
    await VerifyCaptchaToken("token");
    expect.soft(fetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

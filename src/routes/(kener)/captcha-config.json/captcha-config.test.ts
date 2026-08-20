import { describe, expect, it, vi } from "vitest";

const { GetActiveCaptchaProvider } = vi.hoisted(() => ({ GetActiveCaptchaProvider: vi.fn() }));
vi.mock("$lib/server/controllers/captchaController", () => ({ GetActiveCaptchaProvider }));

import { GET } from "./+server";

describe("GET /captcha-config.json", () => {
  it("returns provider:null when no captcha is configured", async () => {
    GetActiveCaptchaProvider.mockResolvedValue(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await GET({} as any);
    expect(await response.json()).toEqual({ provider: null, siteKey: null });
  });

  it("returns the active provider's public site key only, never the secret", async () => {
    GetActiveCaptchaProvider.mockResolvedValue({
      provider: "hcaptcha",
      siteKey: "public-site-key",
      secretKey: "never-should-appear",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await GET({} as any);
    const body = await response.json();
    expect(body).toEqual({ provider: "hcaptcha", siteKey: "public-site-key" });
    expect(JSON.stringify(body)).not.toContain("never-should-appear");
  });
});

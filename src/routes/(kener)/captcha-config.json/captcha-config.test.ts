import { describe, expect, it, vi } from "vitest";

const { GetPublicCaptchaConfig } = vi.hoisted(() => ({ GetPublicCaptchaConfig: vi.fn() }));
vi.mock("$lib/server/controllers/captchaController", () => ({ GetPublicCaptchaConfig }));

import { GET } from "./+server";

describe("GET /captcha-config.json", () => {
  it("returns provider:null when no captcha is configured", async () => {
    GetPublicCaptchaConfig.mockResolvedValue({ provider: null, siteKey: null, misconfigured: false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await GET({} as any);
    expect(await response.json()).toEqual({ provider: null, siteKey: null, misconfigured: false });
  });

  it("reports misconfigured so the client keeps the form blocked instead of reading it as captcha-off", async () => {
    GetPublicCaptchaConfig.mockResolvedValue({ provider: null, siteKey: null, misconfigured: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await GET({} as any);
    expect(await response.json()).toEqual({ provider: null, siteKey: null, misconfigured: true });
  });

  it("returns the active provider's public site key only, never the secret", async () => {
    GetPublicCaptchaConfig.mockResolvedValue({
      provider: "hcaptcha",
      siteKey: "public-site-key",
      misconfigured: false,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await GET({} as any);
    const body = await response.json();
    expect(body).toEqual({ provider: "hcaptcha", siteKey: "public-site-key", misconfigured: false });
    expect(JSON.stringify(body)).not.toContain("never-should-appear");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

const { GetAllCaptchaData } = vi.hoisted(() => ({ GetAllCaptchaData: vi.fn() }));
vi.mock("./siteDataController.js", () => ({ GetAllCaptchaData }));

import { GetActiveCaptchaProvider, VerifyCaptchaToken } from "./captchaController";

describe("captchaController", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    GetAllCaptchaData.mockReset();
  });

  describe("GetActiveCaptchaProvider", () => {
    it("returns null when no provider is enabled", async () => {
      GetAllCaptchaData.mockResolvedValue([
        { key: "captcha.hcaptcha", value: { isEnabled: false, requirements: {} } },
      ]);
      expect(await GetActiveCaptchaProvider()).toBeNull();
    });

    it("returns the enabled provider with its keys", async () => {
      GetAllCaptchaData.mockResolvedValue([
        { key: "captcha.hcaptcha", value: { isEnabled: false, requirements: {} } },
        {
          key: "captcha.turnstile",
          value: { isEnabled: true, requirements: { "Site Key": "site-abc", "Secret Key": "secret-xyz" } },
        },
      ]);
      expect(await GetActiveCaptchaProvider()).toEqual({
        provider: "turnstile",
        siteKey: "site-abc",
        secretKey: "secret-xyz",
      });
    });

    it("returns null when the enabled entry is missing its keys", async () => {
      GetAllCaptchaData.mockResolvedValue([{ key: "captcha.recaptcha", value: { isEnabled: true, requirements: {} } }]);
      expect(await GetActiveCaptchaProvider()).toBeNull();
    });
  });

  describe("VerifyCaptchaToken", () => {
    it("passes with no token when no provider is configured", async () => {
      GetAllCaptchaData.mockResolvedValue([]);
      expect(await VerifyCaptchaToken(undefined)).toEqual({ success: true });
    });

    it("fails when a provider is configured but no token is given", async () => {
      GetAllCaptchaData.mockResolvedValue([
        { key: "captcha.hcaptcha", value: { isEnabled: true, requirements: { "Site Key": "s", "Secret Key": "sec" } } },
      ]);
      expect(await VerifyCaptchaToken(undefined)).toEqual({ success: false });
    });

    it("calls the provider's siteverify endpoint and returns success on a valid token", async () => {
      GetAllCaptchaData.mockResolvedValue([
        {
          key: "captcha.turnstile",
          value: { isEnabled: true, requirements: { "Site Key": "s", "Secret Key": "sec" } },
        },
      ]);
      const fetchMock = vi.fn().mockResolvedValue({ json: async () => ({ success: true }) });
      vi.stubGlobal("fetch", fetchMock);

      const result = await VerifyCaptchaToken("solved-token");

      expect(result).toEqual({ success: true });
      expect(fetchMock).toHaveBeenCalledWith(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        expect.objectContaining({ method: "POST" }),
      );
      const body = fetchMock.mock.calls[0][1].body as string;
      expect(body).toContain("secret=sec");
      expect(body).toContain("response=solved-token");
    });

    it("returns failure when the provider rejects the token", async () => {
      GetAllCaptchaData.mockResolvedValue([
        { key: "captcha.hcaptcha", value: { isEnabled: true, requirements: { "Site Key": "s", "Secret Key": "sec" } } },
      ]);
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ success: false }) }));

      expect(await VerifyCaptchaToken("bad-token")).toEqual({ success: false });
    });

    it("returns failure when the verify request throws", async () => {
      GetAllCaptchaData.mockResolvedValue([
        { key: "captcha.hcaptcha", value: { isEnabled: true, requirements: { "Site Key": "s", "Secret Key": "sec" } } },
      ]);
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

      expect(await VerifyCaptchaToken("token")).toEqual({ success: false });
    });

    it("fails closed when an enabled provider is missing its keys, instead of treating captcha as off", async () => {
      GetAllCaptchaData.mockResolvedValue([{ key: "captcha.recaptcha", value: { isEnabled: true, requirements: {} } }]);

      expect(await VerifyCaptchaToken("any-token")).toEqual({ success: false });
      expect(await VerifyCaptchaToken(undefined)).toEqual({ success: false });
    });

    it("aborts the verify request after a timeout instead of hanging indefinitely", async () => {
      GetAllCaptchaData.mockResolvedValue([
        { key: "captcha.hcaptcha", value: { isEnabled: true, requirements: { "Site Key": "s", "Secret Key": "sec" } } },
      ]);
      vi.useFakeTimers();
      const fetchMock = vi.fn((_url: string, options: RequestInit) => {
        return new Promise((_resolve, reject) => {
          options.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        });
      });
      vi.stubGlobal("fetch", fetchMock);

      const resultPromise = VerifyCaptchaToken("token");
      await vi.advanceTimersByTimeAsync(10000);
      const result = await resultPromise;

      expect(result).toEqual({ success: false });
      expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);

      vi.useRealTimers();
    });
  });
});

import { GetAllCaptchaData } from "./siteDataController.js";

export type CaptchaProviderName = "hcaptcha" | "recaptcha" | "turnstile";

export interface ActiveCaptchaProvider {
  provider: CaptchaProviderName;
  siteKey: string;
  secretKey: string;
}

const SITEVERIFY_URL: Record<CaptchaProviderName, string> = {
  hcaptcha: "https://hcaptcha.com/siteverify",
  recaptcha: "https://www.google.com/recaptcha/api/siteverify",
  turnstile: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
};

const KEY_TO_PROVIDER: Record<string, CaptchaProviderName> = {
  "captcha.hcaptcha": "hcaptcha",
  "captcha.recaptcha": "recaptcha",
  "captcha.turnstile": "turnstile",
};

export async function GetActiveCaptchaProvider(): Promise<ActiveCaptchaProvider | null> {
  const entries = await GetAllCaptchaData();
  const active = entries.find((e) => e.value?.isEnabled === true && KEY_TO_PROVIDER[e.key]);
  if (!active) {
    return null;
  }

  const requirements = active.value.requirements || {};
  const siteKey = requirements["Site Key"];
  const secretKey = requirements["Secret Key"];
  if (!siteKey || !secretKey) {
    return null;
  }

  return { provider: KEY_TO_PROVIDER[active.key], siteKey, secretKey };
}

export async function VerifyCaptchaToken(token: string | undefined | null): Promise<{ success: boolean }> {
  const active = await GetActiveCaptchaProvider();
  if (!active) {
    // No provider configured: captcha is off, nothing to verify.
    return { success: true };
  }
  if (!token) {
    return { success: false };
  }

  try {
    const response = await fetch(SITEVERIFY_URL[active.provider], {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: active.secretKey, response: token }).toString(),
    });
    const body = (await response.json()) as { success?: boolean };
    return { success: body.success === true };
  } catch (err) {
    console.error("Captcha verification request failed", err);
    return { success: false };
  }
}

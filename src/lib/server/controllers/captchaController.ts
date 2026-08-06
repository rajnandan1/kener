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

const VERIFY_TIMEOUT_MS = 5000;

type CaptchaResolution =
  | { status: "disabled" }
  | { status: "misconfigured"; key: string }
  | { status: "active"; provider: ActiveCaptchaProvider };

async function resolveCaptchaConfig(): Promise<CaptchaResolution> {
  const entries = await GetAllCaptchaData();
  const enabledEntry = entries.find((e) => e.value?.isEnabled === true && KEY_TO_PROVIDER[e.key]);
  if (!enabledEntry) {
    return { status: "disabled" };
  }

  const requirements = enabledEntry.value.requirements || {};
  const siteKey = requirements["Site Key"];
  const secretKey = requirements["Secret Key"];
  if (!siteKey || !secretKey) {
    return { status: "misconfigured", key: enabledEntry.key };
  }

  return { status: "active", provider: { provider: KEY_TO_PROVIDER[enabledEntry.key], siteKey, secretKey } };
}

export async function GetActiveCaptchaProvider(): Promise<ActiveCaptchaProvider | null> {
  const resolution = await resolveCaptchaConfig();
  return resolution.status === "active" ? resolution.provider : null;
}

export async function VerifyCaptchaToken(token: string | undefined | null): Promise<{ success: boolean }> {
  const resolution = await resolveCaptchaConfig();

  if (resolution.status === "disabled") {
    // No provider configured: captcha is off, nothing to verify.
    return { success: true };
  }
  if (resolution.status === "misconfigured") {
    // A provider is enabled but missing its Site Key/Secret Key — fail
    // closed instead of silently letting captcha protection lapse.
    console.error(`Captcha provider "${resolution.key}" is enabled but missing its Site Key/Secret Key`);
    return { success: false };
  }
  if (!token) {
    return { success: false };
  }

  const active = resolution.provider;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

  try {
    const response = await fetch(SITEVERIFY_URL[active.provider], {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: active.secretKey, response: token }).toString(),
      signal: controller.signal,
    });
    const body = (await response.json()) as { success?: boolean };
    return { success: body.success === true };
  } catch (err) {
    console.error("Captcha verification request failed", err);
    return { success: false };
  } finally {
    clearTimeout(timeoutId);
  }
}

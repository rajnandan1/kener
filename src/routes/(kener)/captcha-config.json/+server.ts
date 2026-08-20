import { json } from "@sveltejs/kit";
import { GetActiveCaptchaProvider } from "$lib/server/controllers/captchaController";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
  const active = await GetActiveCaptchaProvider();
  if (!active) {
    return json({ provider: null, siteKey: null });
  }
  return json({ provider: active.provider, siteKey: active.siteKey });
};

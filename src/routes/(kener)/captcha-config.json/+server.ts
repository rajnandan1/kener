import { json } from "@sveltejs/kit";
import { GetPublicCaptchaConfig } from "$lib/server/controllers/captchaController";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
  return json(await GetPublicCaptchaConfig());
};

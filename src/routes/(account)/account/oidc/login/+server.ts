import { error, redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  BuildAuthorizationUrl,
  GetEffectiveOidcSettings,
  GetOidcCallbackUrl,
  OIDC_COOKIE_NAMES,
} from "$lib/server/controllers/oidcController";

/** Starts the Authorization Code + PKCE flow. */
export const GET: RequestHandler = async ({ url, cookies }) => {
  const { settings } = await GetEffectiveOidcSettings();
  if (!settings.enabled) {
    throw error(404, "OpenID Connect is not enabled");
  }

  let authorization: Awaited<ReturnType<typeof BuildAuthorizationUrl>>;
  try {
    authorization = await BuildAuthorizationUrl(settings, GetOidcCallbackUrl(url.origin));
  } catch (e) {
    console.error("[oidc] login error:", e);
    throw error(500, "Failed to initiate OpenID Connect login");
  }

  const cookieOptions = {
    path: process.env.KENER_BASE_PATH || "/",
    httpOnly: true,
    secure: (process.env.ORIGIN || "").startsWith("https://"),
    sameSite: "lax" as const,
    maxAge: 600,
  };
  cookies.set(OIDC_COOKIE_NAMES.state, authorization.state, cookieOptions);
  cookies.set(OIDC_COOKIE_NAMES.nonce, authorization.nonce, cookieOptions);
  cookies.set(OIDC_COOKIE_NAMES.codeVerifier, authorization.codeVerifier, cookieOptions);

  throw redirect(302, authorization.url);
};

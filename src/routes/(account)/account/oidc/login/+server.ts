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

  const cookiePath = process.env.KENER_BASE_PATH || "/";
  // Set by /account/logout: the user explicitly signed out, so do not let the IdP's
  // still-alive SSO session sign them straight back in without credentials.
  const forceLogin = !!cookies.get(OIDC_COOKIE_NAMES.reauth);

  let authorization: Awaited<ReturnType<typeof BuildAuthorizationUrl>>;
  try {
    authorization = await BuildAuthorizationUrl(settings, GetOidcCallbackUrl(url.origin), { forceLogin });
  } catch (e) {
    console.error("[oidc] login error:", e);
    throw error(500, "Failed to initiate OpenID Connect login");
  }

  const cookieOptions = {
    path: cookiePath,
    httpOnly: true,
    secure: (process.env.ORIGIN || "").startsWith("https://"),
    sameSite: "lax" as const,
    maxAge: 600,
  };
  cookies.set(OIDC_COOKIE_NAMES.state, authorization.state, cookieOptions);
  cookies.set(OIDC_COOKIE_NAMES.nonce, authorization.nonce, cookieOptions);
  cookies.set(OIDC_COOKIE_NAMES.codeVerifier, authorization.codeVerifier, cookieOptions);
  if (forceLogin) cookies.delete(OIDC_COOKIE_NAMES.reauth, { path: cookiePath });

  throw redirect(302, authorization.url);
};

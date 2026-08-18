import { error, isRedirect, redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  FindOrCreateOidcUser,
  GetEffectiveOidcSettings,
  GetOidcCallbackUrl,
  HandleCallback,
  OIDC_COOKIE_NAMES,
  OidcAuthError,
} from "$lib/server/controllers/oidcController";
import { CookieConfig, GenerateToken } from "$lib/server/controllers/commonController";
import serverResolve from "$lib/server/resolver.js";
import type { OidcErrorCode } from "$lib/types/site";

function signinWithError(code: OidcErrorCode): string {
  return serverResolve(`/account/signin?oidc_error=${code}`);
}

/**
 * Finishes the OIDC flow. Every failure redirects to the sign-in page with an
 * error *code*; details (IdP error_description, exception messages) only go to
 * the server log.
 */
export const GET: RequestHandler = async ({ url, cookies }) => {
  const { settings } = await GetEffectiveOidcSettings();
  if (!settings.enabled) {
    throw error(404, "OpenID Connect is not enabled");
  }

  const providerError = url.searchParams.get("error");
  if (providerError) {
    console.error(`[oidc] provider error: ${providerError} - ${url.searchParams.get("error_description") ?? ""}`);
    throw redirect(302, signinWithError("provider_error"));
  }

  const expectedState = cookies.get(OIDC_COOKIE_NAMES.state);
  const expectedNonce = cookies.get(OIDC_COOKIE_NAMES.nonce);
  const codeVerifier = cookies.get(OIDC_COOKIE_NAMES.codeVerifier);
  const cookiePath = process.env.KENER_BASE_PATH || "/";
  for (const name of Object.values(OIDC_COOKIE_NAMES)) {
    cookies.delete(name, { path: cookiePath });
  }

  if (!expectedState || !expectedNonce || !codeVerifier) {
    throw redirect(302, signinWithError("session_expired"));
  }

  try {
    const identity = await HandleCallback(
      settings,
      GetOidcCallbackUrl(url.origin),
      url,
      expectedState,
      expectedNonce,
      codeVerifier,
    );
    const user = await FindOrCreateOidcUser(settings, identity);
    if (!user.is_active) throw new OidcAuthError("deactivated");
    if (!user.role_ids || user.role_ids.length === 0) throw new OidcAuthError("no_roles");

    const token = await GenerateToken(user);
    const cookieConfig = CookieConfig();
    cookies.set(cookieConfig.name, token, {
      path: cookieConfig.path,
      maxAge: cookieConfig.maxAge,
      httpOnly: cookieConfig.httpOnly,
      secure: cookieConfig.secure,
      sameSite: cookieConfig.sameSite,
    });
  } catch (e) {
    if (isRedirect(e)) throw e;
    const code: OidcErrorCode = e instanceof OidcAuthError ? e.code : "auth_failed";
    console.error(`[oidc] callback failed (${code}):`, e);
    throw redirect(302, signinWithError(code));
  }

  throw redirect(302, serverResolve("/manage/app/site-configurations"));
};

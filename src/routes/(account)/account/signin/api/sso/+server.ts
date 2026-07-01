import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { GetSSOConfig, GetSSOAuthorizationUrl, GetSSOStateCookieConfig } from "$lib/server/controllers/ssoController";

export const GET: RequestHandler = async ({ url, cookies }) => {
  const config = GetSSOConfig();
  if (!config) {
    return new Response("SSO is not configured", { status: 400 });
  }

  const redirectUri = `${url.origin}/account/signin/api/sso/callback`;
  const { url: authUrl, state } = GetSSOAuthorizationUrl(config, redirectUri);

  // Store state in cookie for CSRF protection
  const stateCookie = GetSSOStateCookieConfig();
  cookies.set(stateCookie.name, state, {
    path: stateCookie.path,
    maxAge: stateCookie.maxAge,
    httpOnly: stateCookie.httpOnly,
    secure: stateCookie.secure,
    sameSite: stateCookie.sameSite,
  });

  throw redirect(302, authUrl);
};

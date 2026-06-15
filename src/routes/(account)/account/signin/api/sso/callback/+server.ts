import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { CookieConfig } from "$lib/server/controllers/commonController";
import {
  GetSSOConfig,
  HandleSSOCallback,
  GetSSOStateCookieConfig,
} from "$lib/server/controllers/ssoController";
import serverResolver from "$lib/server/resolver.js";

export const GET: RequestHandler = async ({ url, cookies }) => {
  const config = GetSSOConfig();
  if (!config) {
    return new Response("SSO is not configured", { status: 400 });
  }

  // Verify state for CSRF protection
  const stateParam = url.searchParams.get("state");
  const stateCookie = cookies.get("sso_state");
  if (!stateParam || !stateCookie || stateParam !== stateCookie) {
    return new Response("Invalid state parameter. Possible CSRF attack.", { status: 400 });
  }

  // Clear the state cookie
  const stateCookieConfig = GetSSOStateCookieConfig();
  cookies.delete(stateCookieConfig.name, { path: stateCookieConfig.path });

  // Check for error from provider
  const error = url.searchParams.get("error");
  if (error) {
    return new Response(`SSO provider returned an error: ${error}`, { status: 400 });
  }

  const code = url.searchParams.get("code");
  if (!code) {
    return new Response("No authorization code received", { status: 400 });
  }

  let token: string;
  try {
    const redirectUri = `${url.origin}/account/signin/api/sso/callback`;
    const result = await HandleSSOCallback(config, code, redirectUri);
    token = result.token;
  } catch (e) {
    const message = e instanceof Error ? e.message : "SSO authentication failed";
    const redirectUrl = `${serverResolver("/account/signin")}?error=${encodeURIComponent(message)}`;
    throw redirect(302, redirectUrl);
  }

  const cookieConfig = CookieConfig();
  cookies.set("kener-user", token, {
    path: cookieConfig.path,
    maxAge: cookieConfig.maxAge,
    httpOnly: cookieConfig.httpOnly,
    secure: cookieConfig.secure,
    sameSite: cookieConfig.sameSite,
  });

  throw redirect(302, serverResolver("/manage"));
};

import { redirect, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  GetOidcSettings,
  HandleCallback,
  FindOrCreateOidcUser,
  GenerateOidcSession,
} from "$lib/server/controllers/oidcController";
import serverResolve from "$lib/server/resolver.js";

export const GET: RequestHandler = async ({ url, cookies }) => {
  const settings = await GetOidcSettings();
  if (!settings) {
    throw error(404, "OpenID Connect is not configured or not enabled");
  }

  // Check for error response from the provider first, before
  // checking cookies — this way expired cookies don't hide the
  // actual IdP error message.
  const errorParam = url.searchParams.get("error");
  if (errorParam) {
    const errorDesc = url.searchParams.get("error_description") || errorParam;
    console.error(`OIDC provider error: ${errorParam} - ${errorDesc}`);
    throw redirect(302, serverResolve(`/account/signin?oidc_error=${encodeURIComponent(errorDesc)}`));
  }

  const expectedState = cookies.get("oidc-state");
  const expectedNonce = cookies.get("oidc-nonce");
  const codeVerifier = cookies.get("oidc-code-verifier");

  const cookiePath = process.env.KENER_BASE_PATH || "/";
  cookies.delete("oidc-state", { path: cookiePath });
  cookies.delete("oidc-nonce", { path: cookiePath });
  cookies.delete("oidc-code-verifier", { path: cookiePath });

  if (!expectedState || !expectedNonce || !codeVerifier) {
    throw error(400, "Missing OIDC session data. Please try logging in again.");
  }

  try {
    const basePath = process.env.KENER_BASE_PATH || "";
    const callbackUrl = `${url.origin}${basePath}/account/oidc/callback`;

    const oidcData = await HandleCallback(
      settings,
      callbackUrl,
      url,
      expectedState,
      expectedNonce,
      codeVerifier,
    );

    const user = await FindOrCreateOidcUser(settings, oidcData);

    if (!user.is_active) {
      throw redirect(
        302,
        serverResolve("/account/signin?oidc_error=" + encodeURIComponent(
          "Your account has been deactivated. Please contact an administrator.",
        )),
      );
    }

    if (!user.role_ids || user.role_ids.length === 0) {
      throw redirect(
        302,
        serverResolve("/account/signin?oidc_error=" + encodeURIComponent(
          "Your account has no active roles assigned. Please contact an administrator.",
        )),
      );
    }

    const { token, cookieConfig } = await GenerateOidcSession(user);

    cookies.set(cookieConfig.name, token, {
      path: cookieConfig.path,
      maxAge: cookieConfig.maxAge,
      httpOnly: cookieConfig.httpOnly,
      secure: cookieConfig.secure,
      sameSite: cookieConfig.sameSite,
    });

    throw redirect(302, serverResolve("/manage/app/site-configurations"));
  } catch (e) {
    if (e && typeof e === "object" && "status" in e) {
      const status = (e as { status: number }).status;
      if (status >= 300 && status < 400) {
        throw e;
      }
    }

    const message = e instanceof Error ? e.message : "Authentication failed";
    console.error("OIDC callback error:", e);
    throw redirect(
      302,
      serverResolve(`/account/signin?oidc_error=${encodeURIComponent(message)}`),
    );
  }
};

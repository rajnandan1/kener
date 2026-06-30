import { redirect, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { GetOidcSettings, BuildAuthorizationUrl } from "$lib/server/controllers/oidcController";

export const GET: RequestHandler = async ({ url, cookies }) => {
  const settings = await GetOidcSettings();
  if (!settings) {
    throw error(404, "OpenID Connect is not configured or not enabled");
  }

  const basePath = process.env.KENER_BASE_PATH || "";
  const callbackUrl = `${url.origin}${basePath}/account/oidc/callback`;

  try {
    const { url: authUrl, state, nonce, codeVerifier } = await BuildAuthorizationUrl(
      settings,
      callbackUrl,
    );

    const isSecure = process.env.ORIGIN?.startsWith("https://") ?? false;
    const cookiePath = process.env.KENER_BASE_PATH || "/";

    const cookieOptions = {
      path: cookiePath,
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax" as const,
      maxAge: 600,
    };

    cookies.set("oidc-state", state, cookieOptions);
    cookies.set("oidc-nonce", nonce, cookieOptions);
    cookies.set("oidc-code-verifier", codeVerifier, cookieOptions);

    throw redirect(302, authUrl);
  } catch (e) {
    if (e && typeof e === "object" && "status" in e && (e as { status: number }).status === 302) {
      throw e;
    }
    console.error("OIDC login error:", e);
    throw error(500, "Failed to initiate OpenID Connect login");
  }
};

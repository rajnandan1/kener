import { redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import serverResolve from "$lib/server/resolver.js";
import { OIDC_COOKIE_NAMES } from "$lib/server/controllers/oidcController";

export const load: PageServerLoad = async () => {
  throw redirect(302, serverResolve("/account/signin"));
};

export const actions: Actions = {
  default: async ({ cookies }) => {
    cookies.delete("kener-user", { path: serverResolve("/") });
    // Logging out of Kener does not end the identity provider's SSO session. Mark this
    // browser so the next "Sign in with <provider>" asks for credentials (prompt=login)
    // instead of silently signing the same user back in. Session-scoped: consumed by
    // /account/oidc/login or gone when the browser closes. Same path convention as the
    // other OIDC cookies so the login route can delete it.
    cookies.set(OIDC_COOKIE_NAMES.reauth, "1", {
      path: process.env.KENER_BASE_PATH || "/",
      httpOnly: true,
      secure: (process.env.ORIGIN || "").startsWith("https://"),
      sameSite: "lax",
    });
    throw redirect(302, serverResolve("/account/signin"));
  },
};

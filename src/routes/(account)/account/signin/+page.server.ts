import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  GetUserByEmail,
  GetUsersCount,
  GetUserPasswordHashById,
  CreateFirstUser,
} from "$lib/server/controllers/userController";
import { VerifyPassword, HashPassword, GenerateToken, CookieConfig } from "$lib/server/controllers/commonController";
import { GetOidcPublicState } from "$lib/server/controllers/oidcController";
import serverResolve from "$lib/server/resolver.js";
import GC from "$lib/global-constants";
import { OIDC_ERROR_CODES, type OidcErrorCode } from "$lib/types/site";

/**
 * Every refusal that happens before the real password check still costs one bcrypt
 * compare (against a throw-away hash computed once per process), so response time
 * does not reveal whether an email exists, is an OIDC account, or has no password.
 */
let dummyHash: Promise<string> | undefined;
async function equalizeTiming(password: string): Promise<void> {
  dummyHash ??= HashPassword("kener-timing-equalizer");
  await VerifyPassword(password, await dummyHash);
}

function oidcErrorMessage(code: string | null): string | null {
  if (!code) return null;
  const known = (OIDC_ERROR_CODES as readonly string[]).includes(code) ? (code as OidcErrorCode) : "auth_failed";
  return GC.OIDC_ERROR_MESSAGES[known];
}

export const load = (async ({ parent, url }) => {
  const parentData = await parent();

  if (!!parentData.loggedInUser && parentData.isSetupComplete) {
    throw redirect(302, serverResolve("/manage/app/site-configurations"));
  }

  return {
    ...parentData,
    oidc: await GetOidcPublicState(),
    oidcError: oidcErrorMessage(url.searchParams.get("oidc_error")),
  };
}) satisfies PageServerLoad;

export const actions: Actions = {
  login: async ({ request, cookies }) => {
    const formData = await request.formData();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      return fail(400, { error: "Email and password are required", values: { email } });
    }

    const userCount = await GetUsersCount();
    if (!userCount || Number(userCount.count) === 0) {
      return fail(400, { error: GC.ERROR_NO_SETUP, values: { email } });
    }

    const oidc = await GetOidcPublicState();
    const userDB = await GetUserByEmail(email);

    // When local login is disabled only the owner may use a password (break-glass
    // when the IdP is down). Unknown emails, non-owners and an owner with a wrong
    // password all get the same generic 401 (the form is already presented as
    // owner-only), so neither the status nor the message singles out any account.
    if (oidc.enabled && !oidc.allowLocalLogin && (!userDB || userDB.is_owner !== "YES")) {
      await equalizeTiming(password);
      return fail(401, { error: "Invalid password or Email", values: { email } });
    }

    // Unknown email and wrong password are indistinguishable — no account enumeration,
    // neither by message nor by response time.
    if (!userDB) {
      await equalizeTiming(password);
      return fail(401, { error: "Invalid password or Email", values: { email } });
    }

    // OIDC accounts never authenticate with a password, even if a hash were ever
    // present. Same generic message as a wrong password — this must not become a
    // distinguishable "uses SSO" answer.
    if (userDB.auth_provider === GC.AUTH_PROVIDER_OIDC) {
      await equalizeTiming(password);
      return fail(401, { error: "Invalid password or Email", values: { email } });
    }

    // OIDC accounts have an empty password hash and fall through to the generic
    // invalid-credentials answer below — no dedicated message.
    const passwordStored = await GetUserPasswordHashById(userDB.id);
    if (!passwordStored || !passwordStored.password_hash) {
      await equalizeTiming(password);
      return fail(401, { error: "Invalid password or Email", values: { email } });
    }

    const isMatch = await VerifyPassword(password, passwordStored.password_hash);
    if (!isMatch) {
      return fail(401, { error: "Invalid password or Email", values: { email } });
    }

    if (!userDB.is_active) {
      return fail(403, {
        error: "Your account has been deactivated. Please contact an administrator.",
        values: { email },
      });
    }

    if (!userDB.role_ids || userDB.role_ids.length === 0) {
      return fail(403, {
        error: "Your account has no active roles assigned. Please contact an administrator.",
        values: { email },
      });
    }

    const token = await GenerateToken(userDB);
    const cookieConfig = CookieConfig();
    cookies.set(cookieConfig.name, token, {
      path: cookieConfig.path,
      maxAge: cookieConfig.maxAge,
      httpOnly: cookieConfig.httpOnly,
      secure: cookieConfig.secure,
      sameSite: cookieConfig.sameSite,
    });

    throw redirect(302, serverResolve("/manage/app/site-configurations"));
  },
  signup: async ({ request, cookies }) => {
    const formData = await request.formData();
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!name || !email || !password) {
      return fail(400, { error: "Email, password, and name are required", values: { name, email } });
    }

    const userCount = await GetUsersCount();
    if (userCount && Number(userCount.count) !== 0) {
      return fail(400, {
        error: "Set up already done. Please login with the email and password you have set up.",
        values: { name, email },
      });
    }

    try {
      await CreateFirstUser({ email, name, password });
      const userDB = await GetUserByEmail(email);

      if (!userDB) {
        return fail(500, { error: "Failed to create user", values: { name, email } });
      }

      const token = await GenerateToken(userDB);
      const cookieConfig = CookieConfig();
      cookies.set(cookieConfig.name, token, {
        path: cookieConfig.path,
        maxAge: cookieConfig.maxAge,
        httpOnly: cookieConfig.httpOnly,
        secure: cookieConfig.secure,
        sameSite: cookieConfig.sameSite,
      });

      throw redirect(302, serverResolve("/manage/app/site-configurations"));
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An error occurred during signup";
      return fail(400, { error: errorMessage, values: { name, email } });
    }
  },
};

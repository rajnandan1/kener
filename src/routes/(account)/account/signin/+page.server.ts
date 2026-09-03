import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  GetUserByEmail,
  GetUsersCount,
  GetUserPasswordHashById,
  CreateFirstUser,
} from "$lib/server/controllers/userController";
import { VerifyPassword, GenerateToken, CookieConfig } from "$lib/server/controllers/commonController";
import { GetOidcSettings } from "$lib/server/controllers/oidcController";
import serverResolve from "$lib/server/resolver.js";
import GC from "$lib/global-constants";

// oidc_error carries a code, never free text; anything unknown gets the generic message.
const OIDC_ERROR_MESSAGES: Record<string, string> = {
  provider_error: "The identity provider returned an error. Please try again.",
  account_deactivated: "Your account has been deactivated. Please contact an administrator.",
  no_roles: "Your account has no active roles assigned. Please contact an administrator.",
  not_provisioned: "Your account is not provisioned in this system. Please contact an administrator.",
  email_conflict:
    "An account with this email already exists. OIDC and local accounts are kept separate. Please contact an administrator.",
  auth_failed: "Authentication failed. Please try again or contact an administrator.",
};

export const load: PageServerLoad = async ({ parent, url }) => {
  const parentData = await parent();

  if (!!parentData.loggedInUser && parentData.isSetupComplete) {
    throw redirect(302, serverResolve("/manage/app/site-configurations"));
  }

  const oidcSettings = await GetOidcSettings();
  const oidcErrorCode = url.searchParams.get("oidc_error");
  const oidcError = oidcErrorCode ? (OIDC_ERROR_MESSAGES[oidcErrorCode] ?? OIDC_ERROR_MESSAGES.auth_failed) : null;
  const forceLocalLogin = process.env.KENER_FORCE_LOCAL_LOGIN === "true";

  return {
    ...parentData,
    oidc: oidcSettings
      ? {
          enabled: true,
          providerName: oidcSettings.provider_name || "SSO",
          allowLocalLogin: oidcSettings.allow_local_login || forceLocalLogin,
        }
      : {
          enabled: false,
          providerName: "",
          allowLocalLogin: true,
        },
    oidcError,
  };
};

export const actions: Actions = {
  login: async ({ request, cookies }) => {
    const oidcSettings = await GetOidcSettings();

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

    // Local login can be enabled by setting Env-Variable "KENER_FORCE_LOCAL_LOGIN" == "true".
    // This prevents lockout when the IdP is misconfigured or unreachable.
    // Checked before the user lookup so the response does not reveal whether the email exists.
    const forceLocalLogin = process.env.KENER_FORCE_LOCAL_LOGIN === "true";
    if (oidcSettings && !oidcSettings.allow_local_login && !forceLocalLogin) {
      return fail(403, {
        error: "Local login is disabled. Please use SSO.",
        values: { email },
      });
    }

    const userDB = await GetUserByEmail(email);
    if (!userDB) {
      return fail(401, { error: "User does not exist", values: { email } });
    }
    if (userDB.auth_provider === GC.AUTH_PROVIDER_OIDC) {
      return fail(403, {
        error: "This account uses SSO authentication. Please use the SSO login button.",
        values: { email },
      });
    }

    const passwordStored = await GetUserPasswordHashById(userDB.id);
    if (!passwordStored || !passwordStored.password_hash) {
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
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An error occurred during signup";
      return fail(400, { error: errorMessage, values: { name, email } });
    }

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
  },
};

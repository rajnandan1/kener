/**
 * OpenID Connect controller.
 *
 * Handles OIDC discovery, authorization URL generation, token exchange,
 * user provisioning, and group-to-role synchronization.
 */

import * as client from "openid-client";
import { GenerateRandomHexString } from "../tool.js";
import db from "../db/db.js";
import { GenerateToken, CookieConfig } from "./commonController.js";
import type { OidcSettings } from "$lib/types/site.js";
import type { UserRecordPublic } from "../types/db.js";
import { GetSiteDataByKey } from "./siteDataController.js";
import GC from "$lib/global-constants.js";

// Cache the OIDC configuration to avoid repeated discovery calls
let cachedConfig: client.Configuration | null = null;
let cachedCacheKey: string | null = null;

/**
 * Read the current OIDC settings from the database.
 * Returns null if OIDC is not configured or not enabled.
 */
export async function GetOidcSettings(): Promise<OidcSettings | null> {
  const raw = await GetSiteDataByKey("oidcSettings");
  if (!raw) return null;

  try {
    const settings: OidcSettings = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!settings.enabled) return null;
    return settings;
  } catch {
    return null;
  }
}

/**
 * Get or create the openid-client Configuration via OIDC Discovery.
 * The result is cached until the issuer URL changes.
 */
async function getOidcConfig(settings: OidcSettings): Promise<client.Configuration> {
  const cacheKey = `${settings.issuer_url}|${settings.client_id}|${settings.client_secret}`;
  if (cachedConfig && cachedCacheKey === cacheKey) {
    return cachedConfig;
  }

  const issuer = new URL(settings.issuer_url);
  cachedConfig = await client.discovery(issuer, settings.client_id, settings.client_secret);
  cachedCacheKey = cacheKey;
  return cachedConfig;
}

/**
 * Clear the cached OIDC configuration. Called when settings change.
 */
export function ClearOidcConfigCache(): void {
  cachedConfig = null;
  cachedCacheKey = null;
}

/**
 * Build the authorization redirect URL and return it along with
 * state and nonce values that must be stored in cookies for
 * verification during the callback.
 */
export async function BuildAuthorizationUrl(
  settings: OidcSettings,
  callbackUrl: string,
): Promise<{ url: string; state: string; nonce: string; codeVerifier: string }> {
  const config = await getOidcConfig(settings);

  const state = GenerateRandomHexString();
  const nonce = GenerateRandomHexString();
  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);

  const parameters: Record<string, string> = {
    redirect_uri: callbackUrl,
    scope: settings.scopes || "openid profile email",
    state: state,
    nonce: nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  };

  const url = client.buildAuthorizationUrl(config, parameters);

  return {
    url: url.href,
    state,
    nonce,
    codeVerifier,
  };
}

/**
 * Exchange the authorization code for tokens and extract user information.
 */
export async function HandleCallback(
  settings: OidcSettings,
  callbackUrl: string,
  currentUrl: URL,
  expectedState: string,
  expectedNonce: string,
  codeVerifier: string,
): Promise<{
  sub: string;
  email: string;
  name: string;
  groups: string[];
}> {
  const config = await getOidcConfig(settings);

  const tokens = await client.authorizationCodeGrant(config, currentUrl, {
    pkceCodeVerifier: codeVerifier,
    expectedState: expectedState,
    expectedNonce: expectedNonce,
  });

  const claims = tokens.claims();
  if (!claims) {
    throw new Error("No claims in token response");
  }

  const sub = claims.sub;
  if (!sub) {
    throw new Error("No subject (sub) claim in token");
  }

  let email = claims.email as string | undefined;
  let name = (claims.name as string | undefined) ||
    (claims.preferred_username as string | undefined) ||
    "";

  if (!email) {
    if (!tokens.access_token) {
      throw new Error("No email in ID token and no access_token available for userinfo lookup");
    }
    const userinfo = await client.fetchUserInfo(config, tokens.access_token, sub);
    email = userinfo.email as string | undefined;
    if (!name) {
      name = (userinfo.name as string | undefined) ||
        (userinfo.preferred_username as string | undefined) ||
        "";
    }
  }

  if (!email) {
    throw new Error("No email claim found in token or userinfo response");
  }

  const groupsClaim = settings.groups_claim || "groups";
  let groups: string[] = [];

  const rawGroups = claims[groupsClaim];
  if (Array.isArray(rawGroups)) {
    groups = rawGroups.map((g) => String(g));
  } else if (typeof rawGroups === "string") {
    groups = [rawGroups];
  }

  return {
    sub,
    email: email.toLowerCase().trim(),
    name: name.trim() || email,
    groups,
  };
}

/**
 * Find or create a user based on OIDC authentication, then synchronize
 * their roles based on group mappings.
 */
export async function FindOrCreateOidcUser(
  settings: OidcSettings,
  oidcData: {
    sub: string;
    email: string;
    name: string;
    groups: string[];
  },
): Promise<UserRecordPublic> {
  let user = await db.getUserByOidcSub(oidcData.sub);

  if (!user) {
    if (!settings.auto_create_users) {
      throw new Error(
        "Your account is not provisioned in this system. " +
        "Please contact an administrator.",
      );
    }

    const existingByEmail = await db.getUserByEmail(oidcData.email);
    if (existingByEmail) {
      throw new Error(
        `A local account with the email "${oidcData.email}" already exists. ` +
        "OIDC and local accounts are kept separate. " +
        "Please contact an administrator.",
      );
    }

    const mappedRoleIds = await db.getOidcRoleIdsForGroups(oidcData.groups);
    const roleIds =
      mappedRoleIds.length > 0
        ? mappedRoleIds
        : settings.default_role_id
          ? [settings.default_role_id]
          : ["member"];

    await db.insertUser({
      email: oidcData.email,
      name: oidcData.name,
      password_hash: "",
      role_ids: roleIds,
      auth_provider: GC.AUTH_PROVIDER_OIDC,
      oidc_sub: oidcData.sub,
      is_active: 1,
      is_verified: 1,
    });

    user = await db.getUserByOidcSub(oidcData.sub);
    if (!user) {
      throw new Error("Failed to create OIDC user");
    }

    return user;
  }

  // Sync roles and update profile data from the IdP
  await SyncOidcUserRoles(user.id, oidcData.groups, settings);
  await db.updateUserProfile(user.id, {
    name: oidcData.name,
    email: oidcData.email,
  });

  user = await db.getUserByOidcSub(oidcData.sub);
  if (!user) {
    throw new Error("User disappeared during role sync");
  }

  return user;
}

/**
 * Synchronize a user's roles based on their current OIDC groups.
 * Manually assigned roles (not from any OIDC mapping) are preserved.
 */
async function SyncOidcUserRoles(
  userId: number,
  oidcGroups: string[],
  settings: OidcSettings,
): Promise<void> {
  const allMappings = await db.getAllOidcGroupRoleMappings();
  const allMappedRoleIds = new Set(allMappings.map((m) => m.role_id));

  // The default role is also OIDC-managed (used as fallback)
  if (settings.default_role_id) {
    allMappedRoleIds.add(settings.default_role_id);
  }

  const currentRoleIds = await db.getUserRoleIds(userId);

  // Keep roles that were NOT assigned via OIDC (mapping or default)
  const manualRoles = currentRoleIds.filter((rid) => !allMappedRoleIds.has(rid));

  const newOidcRoleIds = await db.getOidcRoleIdsForGroups(oidcGroups);

  let effectiveOidcRoles = newOidcRoleIds;
  if (effectiveOidcRoles.length === 0 && settings.default_role_id) {
    effectiveOidcRoles = [settings.default_role_id];
  }

  const finalRoleIds = [...new Set([...manualRoles, ...effectiveOidcRoles])];

  const currentSorted = [...currentRoleIds].sort().join(",");
  const newSorted = [...finalRoleIds].sort().join(",");

  if (currentSorted !== newSorted) {
    await db.updateUserRoles(userId, finalRoleIds);
  }
}

/**
 * Generate a JWT token and cookie configuration for an OIDC user.
 */
export async function GenerateOidcSession(user: UserRecordPublic): Promise<{
  token: string;
  cookieConfig: ReturnType<typeof CookieConfig>;
}> {
  const token = await GenerateToken(user);
  const cookieConfig = CookieConfig();
  return { token, cookieConfig };
}

/**
 * Test the OIDC configuration by performing a discovery request.
 */
export async function TestOidcConnection(settings: OidcSettings): Promise<{
  success: boolean;
  issuer?: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  userinfoEndpoint?: string;
  error?: string;
}> {
  try {
    // Build a local configuration for testing only — do not touch
    // the shared cache, as these may be unsaved settings.
    const issuer = new URL(settings.issuer_url);
    const testConfig = await client.discovery(issuer, settings.client_id, settings.client_secret);
    const serverMetadata = testConfig.serverMetadata();

    return {
      success: true,
      issuer: serverMetadata.issuer,
      authorizationEndpoint: serverMetadata.authorization_endpoint,
      tokenEndpoint: serverMetadata.token_endpoint,
      userinfoEndpoint: serverMetadata.userinfo_endpoint,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      error: `OIDC Discovery failed: ${message}`,
    };
  }
}
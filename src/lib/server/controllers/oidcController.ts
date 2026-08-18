/**
 * OpenID Connect controller.
 *
 * Owns: effective settings (DB + KENER_OIDC_* env overrides), the discovery/
 * Configuration cache, authorization URL + callback handling, user provisioning
 * and group→role sync, and the admin helpers (masking, store preparation,
 * mapping validation, connection test).
 */

import * as client from "openid-client";
import { GenerateRandomHexString, IsOidcHttpAllowed, MaskString } from "../tool.js";
import db from "$lib/server/db/db";
import { GetSiteDataByKey } from "./siteDataController.js";
import seedSiteData from "../db/seedSiteData.js";
import GC from "../../global-constants.js";
import type {
  OidcErrorCode,
  OidcIdentity,
  OidcPublicState,
  OidcSettings,
  OidcSettingsMasked,
} from "../../types/site.js";
import type { UserRecordPublic } from "../types/db.js";

// ============ Constants ============

/** Env variable per OidcSettings field. A set, non-empty value overrides the stored value for that field only. */
export const OIDC_ENV_KEYS = {
  enabled: "KENER_OIDC_ENABLED",
  provider_name: "KENER_OIDC_PROVIDER_NAME",
  issuer_url: "KENER_OIDC_ISSUER_URL",
  client_id: "KENER_OIDC_CLIENT_ID",
  client_secret: "KENER_OIDC_CLIENT_SECRET",
  scopes: "KENER_OIDC_SCOPES",
  groups_claim: "KENER_OIDC_GROUPS_CLAIM",
  allow_local_login: "KENER_OIDC_ALLOW_LOCAL_LOGIN",
  auto_create_users: "KENER_OIDC_AUTO_CREATE_USERS",
  default_role_id: "KENER_OIDC_DEFAULT_ROLE_ID",
} as const satisfies Record<keyof OidcSettings, string>;

/** Dev-only: permits an http: issuer. Not an OidcSettings field. */
export const OIDC_HTTP_ENV = "KENER_OIDC_ALLOW_HTTP";

export const OIDC_COOKIE_NAMES = {
  state: "oidc-state",
  nonce: "oidc-nonce",
  codeVerifier: "oidc-code-verifier",
} as const;

const OIDC_FIELDS = Object.keys(OIDC_ENV_KEYS) as (keyof OidcSettings)[];
const BOOLEAN_FIELDS = new Set<keyof OidcSettings>(["enabled", "allow_local_login", "auto_create_users"]);

/** Thrown by the auth flow; `code` is the only thing that reaches the browser. */
export class OidcAuthError extends Error {
  code: OidcErrorCode;
  constructor(code: OidcErrorCode, detail?: string) {
    super(detail ?? code);
    this.name = "OidcAuthError";
    this.code = code;
  }
}

// ============ Effective settings ============

const warnedEnvKeys = new Set<string>();

export function ParseOidcEnvOverrides(env: NodeJS.ProcessEnv = process.env): {
  overrides: Partial<OidcSettings>;
  locked: Set<keyof OidcSettings>;
} {
  const overrides: Record<string, unknown> = {};
  const locked = new Set<keyof OidcSettings>();
  for (const field of OIDC_FIELDS) {
    const envName = OIDC_ENV_KEYS[field];
    const raw = env[envName];
    if (raw === undefined) continue;
    const value = raw.trim();
    if (value === "") continue;
    if (BOOLEAN_FIELDS.has(field)) {
      const lower = value.toLowerCase();
      if (lower !== "true" && lower !== "false") {
        if (!warnedEnvKeys.has(envName)) {
          warnedEnvKeys.add(envName);
          console.warn(`[oidc] Ignoring ${envName}="${raw}": expected "true" or "false"`);
        }
        continue;
      }
      overrides[field] = lower === "true";
    } else {
      overrides[field] = value;
    }
    locked.add(field);
  }
  return { overrides: overrides as Partial<OidcSettings>, locked };
}

async function readStoredOidcSettings(): Promise<OidcSettings> {
  const raw = await GetSiteDataByKey("oidcSettings");
  let stored: Partial<OidcSettings> = {};
  if (raw && typeof raw === "object") {
    stored = raw as Partial<OidcSettings>;
  } else if (typeof raw === "string") {
    try {
      stored = JSON.parse(raw) as Partial<OidcSettings>;
    } catch {
      stored = {};
    }
  }
  return { ...seedSiteData.oidcSettings, ...stored };
}

/** The settings every OIDC code path must use: stored value overlaid with env overrides. */
export async function GetEffectiveOidcSettings(): Promise<{
  settings: OidcSettings;
  envLocked: Set<keyof OidcSettings>;
}> {
  const stored = await readStoredOidcSettings();
  const { overrides, locked } = ParseOidcEnvOverrides();
  return { settings: { ...stored, ...overrides }, envLocked: locked };
}

/** What the sign-in page may know. */
export async function GetOidcPublicState(): Promise<OidcPublicState> {
  const { settings } = await GetEffectiveOidcSettings();
  if (!settings.enabled) {
    return { enabled: false, providerName: "", allowLocalLogin: true };
  }
  return {
    enabled: true,
    providerName: settings.provider_name || "SSO",
    allowLocalLogin: !!settings.allow_local_login,
  };
}

/** Redirect URI registered at the IdP: ORIGIN + KENER_BASE_PATH + /account/oidc/callback. */
export function GetOidcCallbackUrl(fallbackOrigin = ""): string {
  const origin = (process.env.ORIGIN || fallbackOrigin).replace(/\/+$/, "");
  const basePath = (process.env.KENER_BASE_PATH || "").replace(/\/+$/, "");
  return `${origin}${basePath}/account/oidc/callback`;
}

/** Validates the issuer URL scheme. http is only allowed with KENER_OIDC_ALLOW_HTTP=true. */
export function ParseIssuerUrl(issuerUrl: string): URL {
  let issuer: URL;
  try {
    issuer = new URL(issuerUrl);
  } catch {
    throw new Error("Issuer URL is not a valid absolute URL");
  }
  if (issuer.protocol === "https:") return issuer;
  if (issuer.protocol === "http:" && IsOidcHttpAllowed()) return issuer;
  throw new Error(`Issuer URL must use https (set ${OIDC_HTTP_ENV}=true for local development only)`);
}

export function MaskOidcSettings(settings: OidcSettings): OidcSettingsMasked {
  const { client_secret, ...rest } = settings;
  return {
    ...rest,
    client_secret: client_secret ? MaskString(client_secret) : "",
    has_client_secret: !!client_secret,
  };
}

// ============ Discovery / Configuration cache ============

let cachedConfig: client.Configuration | null = null;
let cachedCacheKey: string | null = null;

async function discover(settings: OidcSettings): Promise<client.Configuration> {
  const issuer = ParseIssuerUrl(settings.issuer_url);
  const options = issuer.protocol === "http:" ? { execute: [client.allowInsecureRequests] } : undefined;
  return await client.discovery(issuer, settings.client_id, settings.client_secret, undefined, options);
}

/** Cached Configuration keyed on the effective issuer/client_id/client_secret. */
async function getOidcConfig(settings: OidcSettings): Promise<client.Configuration> {
  const cacheKey = `${settings.issuer_url}|${settings.client_id}|${settings.client_secret}`;
  if (cachedConfig && cachedCacheKey === cacheKey) {
    return cachedConfig;
  }
  const config = await discover(settings);
  cachedConfig = config;
  cachedCacheKey = cacheKey;
  return config;
}

/** Clear the cached Configuration. Called when settings are saved. */
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
  let name = (claims.name as string | undefined) || (claims.preferred_username as string | undefined) || "";

  if (!email) {
    if (!tokens.access_token) {
      throw new Error("No email in ID token and no access_token available for userinfo lookup");
    }
    const userinfo = await client.fetchUserInfo(config, tokens.access_token, sub);
    email = userinfo.email as string | undefined;
    if (!name) {
      name = (userinfo.name as string | undefined) || (userinfo.preferred_username as string | undefined) || "";
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
      throw new Error("Your account is not provisioned in this system. " + "Please contact an administrator.");
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
      mappedRoleIds.length > 0 ? mappedRoleIds : settings.default_role_id ? [settings.default_role_id] : ["member"];

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
async function SyncOidcUserRoles(userId: number, oidcGroups: string[], settings: OidcSettings): Promise<void> {
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

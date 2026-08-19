/**
 * OpenID Connect controller.
 *
 * Owns: effective settings (DB + KENER_OIDC_* env overrides), the discovery/
 * Configuration cache, authorization URL + callback handling, user provisioning
 * and group→role sync, and the admin helpers (masking, store preparation,
 * mapping validation, connection test).
 */

import * as client from "openid-client";
import { GenerateRandomHexString, IsOidcHttpAllowed } from "../tool.js";
import db from "$lib/server/db/db";
import { GetSiteDataByKey } from "./siteDataController.js";
import { IsValidOidcSettings } from "./validators.js";
import seedSiteData from "../db/seedSiteData.js";
import GC from "../../global-constants.js";
import { OIDC_SETTINGS_FIELD_TYPES } from "../../types/site.js";
import type {
  OidcErrorCode,
  OidcGroupRoleMappingEntry,
  OidcGroupRoleMappingInvalidEntry,
  OidcGroupRoleMappingsView,
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

/**
 * KENER_OIDC_DEFAULT_ROLE_ID value meaning "explicitly no default role" (stored as ""),
 * because an empty env value means "unset" for every KENER_OIDC_* key.
 */
export const OIDC_NO_DEFAULT_ROLE = "none";

/** Dev-only: permits an http: issuer. Not an OidcSettings field. */
export const OIDC_HTTP_ENV = "KENER_OIDC_ALLOW_HTTP";

/**
 * JSON object of OIDC group → Kener role id. When set and parseable it fully
 * replaces the `oidc_group_role_mappings` table (no merge). Not an OidcSettings field.
 */
export const OIDC_GROUP_ROLE_MAP_ENV = "KENER_OIDC_GROUP_ROLE_MAP";

export const OIDC_COOKIE_NAMES = {
  state: "oidc-state",
  nonce: "oidc-nonce",
  codeVerifier: "oidc-code-verifier",
  /** Set by logout, consumed by the next /account/oidc/login: forces `prompt=login` at the IdP. */
  reauth: "oidc-reauth",
} as const;

const OIDC_FIELDS = Object.keys(OIDC_ENV_KEYS) as (keyof OidcSettings)[];
const BOOLEAN_FIELDS = new Set<keyof OidcSettings>(
  OIDC_FIELDS.filter((field) => OIDC_SETTINGS_FIELD_TYPES[field] === "boolean"),
);

/** What the admin UI/API sees instead of the client secret. Echoing it back means "unchanged". */
export const OIDC_SECRET_MASK = "********";

/**
 * Timeout (seconds) for every HTTP request openid-client makes — discovery, token
 * exchange, userinfo. Its default is 30 s, which is what an admin would wait for a
 * "Test connection" against an unreachable issuer.
 */
export const OIDC_HTTP_TIMEOUT_SECONDS = 10;

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

/** Log a configuration warning once per distinct `key` (env values do not change at runtime). */
function warnOnce(key: string, message: string): void {
  if (warnedEnvKeys.has(key)) return;
  warnedEnvKeys.add(key);
  console.warn(message);
}

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
        warnOnce(envName, `[oidc] Ignoring ${envName}="${raw}": expected "true" or "false"`);
        continue;
      }
      overrides[field] = lower === "true";
    } else if (field === "default_role_id" && value.toLowerCase() === OIDC_NO_DEFAULT_ROLE) {
      overrides[field] = "";
    } else {
      overrides[field] = value;
    }
    locked.add(field);
  }
  return { overrides: overrides as Partial<OidcSettings>, locked };
}

export type OidcGroupRoleMapEnvResult =
  | { active: false; error?: string }
  | { active: true; entries: OidcGroupRoleMappingEntry[]; invalid: OidcGroupRoleMappingInvalidEntry[] };

/**
 * Parse KENER_OIDC_GROUP_ROLE_MAP without touching the database. Unset/blank →
 * inactive. Unparseable (not a JSON object) → inactive with `error`, warned once,
 * so a typo degrades to the DB mappings instead of crash-looping the process.
 * Entries with an empty or non-string group/role are reported in `invalid`.
 */
export function ParseOidcGroupRoleMapEnv(env: NodeJS.ProcessEnv = process.env): OidcGroupRoleMapEnvResult {
  const raw = env[OIDC_GROUP_ROLE_MAP_ENV];
  if (raw === undefined) return { active: false };
  const value = raw.trim();
  if (value === "") return { active: false };

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    parsed = undefined;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    const error = `${OIDC_GROUP_ROLE_MAP_ENV} must be a JSON object of {"<group>": "<role id>"}; ignoring it and using the mappings saved in the database`;
    warnOnce(`${OIDC_GROUP_ROLE_MAP_ENV}:${value}`, `[oidc] ${error}`);
    return { active: false, error };
  }

  const entries: OidcGroupRoleMappingEntry[] = [];
  const invalid: OidcGroupRoleMappingInvalidEntry[] = [];
  for (const [rawGroup, rawRole] of Object.entries(parsed as Record<string, unknown>)) {
    const group = rawGroup.trim();
    const roleId = typeof rawRole === "string" ? rawRole.trim() : "";
    if (typeof rawRole !== "string") {
      invalid.push({
        oidc_group: group,
        role_id: "",
        reason: `role id must be a string (got ${JSON.stringify(rawRole)})`,
      });
    } else if (!group || !roleId) {
      invalid.push({ oidc_group: group, role_id: roleId, reason: "group and role id must not be empty" });
    } else {
      entries.push({ oidc_group: group, role_id: roleId });
    }
  }
  for (const entry of invalid) warnIgnoredGroupRoleMapEntry(entry);
  return { active: true, entries, invalid };
}

function warnIgnoredGroupRoleMapEntry(entry: OidcGroupRoleMappingInvalidEntry): void {
  warnOnce(
    `${OIDC_GROUP_ROLE_MAP_ENV}:entry:${entry.oidc_group}`,
    `[oidc] Ignoring ${OIDC_GROUP_ROLE_MAP_ENV} entry ${JSON.stringify(entry.oidc_group)}: ${entry.reason}`,
  );
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
    // Fixed-width: MaskString would reveal the secret's length and last 4 characters.
    client_secret: client_secret ? OIDC_SECRET_MASK : "",
    has_client_secret: !!client_secret,
  };
}

// ============ Discovery / Configuration cache ============

let cachedConfig: client.Configuration | null = null;
let cachedCacheKey: string | null = null;

async function discover(settings: OidcSettings): Promise<client.Configuration> {
  const issuer = ParseIssuerUrl(settings.issuer_url);
  const options: client.DiscoveryRequestOptions = { timeout: OIDC_HTTP_TIMEOUT_SECONDS };
  if (issuer.protocol === "http:") options.execute = [client.allowInsecureRequests];
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

/** Clear the cached Configuration (and the warn-once memory). Called when settings are saved. */
export function ClearOidcConfigCache(): void {
  cachedConfig = null;
  cachedCacheKey = null;
  warnedEnvKeys.clear();
}

// ============ Authorization flow ============

/**
 * Build the authorization redirect URL plus the state/nonce/PKCE verifier that
 * must be stored in cookies for verification during the callback.
 */
export async function BuildAuthorizationUrl(
  settings: OidcSettings,
  callbackUrl: string,
  options: { forceLogin?: boolean } = {},
): Promise<{ url: string; state: string; nonce: string; codeVerifier: string }> {
  const config = await getOidcConfig(settings);

  const state = GenerateRandomHexString();
  const nonce = GenerateRandomHexString();
  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);

  const parameters: Record<string, string> = {
    redirect_uri: callbackUrl,
    scope: settings.scopes || "openid profile email",
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  };
  // After a Kener logout the IdP's SSO session is still alive; `prompt=login` makes it
  // ask for credentials again instead of silently re-issuing a code.
  if (options.forceLogin) parameters.prompt = "login";

  const url = client.buildAuthorizationUrl(config, parameters);
  return { url: url.href, state, nonce, codeVerifier };
}

/** Group names from the configured claim: array → strings, string → [string], else []. */
export function ExtractGroups(claims: Record<string, unknown>, groupsClaim: string): string[] {
  const raw = claims[groupsClaim || "groups"];
  if (Array.isArray(raw)) return raw.map((g) => String(g));
  if (typeof raw === "string") return [raw];
  return [];
}

/**
 * Exchange the authorization code for tokens (state/nonce/PKCE verified by
 * openid-client) and extract the identity. openid-client derives the
 * `redirect_uri` it sends to the token endpoint from the URL it is given, so we
 * hand it the registered callback URL with the incoming query — the request URL
 * behind a reverse proxy may differ from what is registered at the IdP.
 * Throws OidcAuthError("auth_failed") when required claims are missing; other
 * library errors propagate as-is (the route maps them to "auth_failed").
 */
export async function HandleCallback(
  settings: OidcSettings,
  callbackUrl: string,
  currentUrl: URL,
  expectedState: string,
  expectedNonce: string,
  codeVerifier: string,
): Promise<OidcIdentity> {
  const config = await getOidcConfig(settings);
  const exchangeUrl = new URL(callbackUrl);
  exchangeUrl.search = currentUrl.search;

  const tokens = await client.authorizationCodeGrant(config, exchangeUrl, {
    pkceCodeVerifier: codeVerifier,
    expectedState,
    expectedNonce,
  });

  const claims = tokens.claims();
  if (!claims) throw new OidcAuthError("auth_failed", "No claims in token response");
  const sub = claims.sub;
  if (!sub) throw new OidcAuthError("auth_failed", "No subject (sub) claim in ID token");

  let email = typeof claims.email === "string" ? claims.email : undefined;
  let name =
    (typeof claims.name === "string" && claims.name) ||
    (typeof claims.preferred_username === "string" && claims.preferred_username) ||
    "";

  if (!email) {
    if (!tokens.access_token) {
      throw new OidcAuthError("auth_failed", "No email in ID token and no access_token for userinfo lookup");
    }
    const userinfo = await client.fetchUserInfo(config, tokens.access_token, sub);
    email = typeof userinfo.email === "string" ? userinfo.email : undefined;
    if (!name) {
      name =
        (typeof userinfo.name === "string" && userinfo.name) ||
        (typeof userinfo.preferred_username === "string" && userinfo.preferred_username) ||
        "";
    }
  }
  if (!email) throw new OidcAuthError("auth_failed", "No email claim in ID token or userinfo");

  const normalizedEmail = email.toLowerCase().trim();
  return {
    // The discovered issuer identifier (openid-client has validated the ID token's `iss` against
    // it), in normalized URL form — the same form the migration backfills from the configured
    // issuer URL, and the form discovery compares against (`new URL(issuer).href`).
    issuer: new URL(config.serverMetadata().issuer).href,
    sub,
    email: normalizedEmail,
    name: name.trim() || normalizedEmail,
    groups: ExtractGroups(claims as Record<string, unknown>, settings.groups_claim),
  };
}

// ============ Group→role mappings ============

/**
 * The group→role mappings every role computation must use. When
 * KENER_OIDC_GROUP_ROLE_MAP is set and parseable it is the whole universe —
 * the database table is not consulted — and entries naming a missing or
 * inactive role are dropped (warned once, reported in `invalid`). Otherwise the
 * database rows are returned unchanged (with ids, for the admin UI).
 */
export async function GetEffectiveOidcGroupRoleMappings(): Promise<OidcGroupRoleMappingsView> {
  const parsed = ParseOidcGroupRoleMapEnv();
  if (!parsed.active) {
    const rows = await db.getAllOidcGroupRoleMappings();
    const view: OidcGroupRoleMappingsView = { source: "db", mappings: rows, invalid: [] };
    if (parsed.error) view.error = parsed.error;
    return view;
  }

  const roleStatus = new Map<string, string>();
  for (const role of await db.getAllRoles()) roleStatus.set(role.id, role.status);

  const mappings: OidcGroupRoleMappingEntry[] = [];
  const invalid: OidcGroupRoleMappingInvalidEntry[] = [...parsed.invalid];
  for (const entry of parsed.entries) {
    const status = roleStatus.get(entry.role_id);
    if (status === "ACTIVE") {
      mappings.push(entry);
      continue;
    }
    const reason = status === undefined ? `role "${entry.role_id}" not found` : `role "${entry.role_id}" is not active`;
    const dropped = { ...entry, reason };
    invalid.push(dropped);
    warnIgnoredGroupRoleMapEntry(dropped);
  }
  return { source: "env", mappings, invalid };
}

/**
 * ACTIVE role ids the given groups map to. Exact, case-sensitive group match on
 * both paths (the DB join filters ACTIVE itself; env mappings were filtered
 * when loaded).
 */
async function resolveOidcRoleIds(view: OidcGroupRoleMappingsView, groups: string[]): Promise<string[]> {
  if (view.source === "db") return await db.getOidcRoleIdsForGroups(groups);
  if (groups.length === 0) return [];
  const wanted = new Set(groups);
  return [...new Set(view.mappings.filter((m) => wanted.has(m.oidc_group)).map((m) => m.role_id))];
}

// ============ Provisioning & sync ============

function isUniqueViolation(e: unknown): boolean {
  const message = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return message.includes("unique") || message.includes("duplicate");
}

async function provisionOidcUser(settings: OidcSettings, identity: OidcIdentity): Promise<UserRecordPublic> {
  if (!settings.auto_create_users) {
    throw new OidcAuthError("not_provisioned", `auto_create_users is off; refusing sub=${identity.sub}`);
  }
  const emailOwner = await db.getUserByEmail(identity.email);
  if (emailOwner) {
    // Details are logged by the route: name records by id, never by email address.
    throw new OidcAuthError(
      "not_provisioned",
      `the provider's email already belongs to user ${emailOwner.id} (${emailOwner.auth_provider}); OIDC and local accounts are never merged (sub=${identity.sub})`,
    );
  }
  // No mapped role → the active default role → refuse. There is deliberately no
  // hardcoded fallback role: an identity that matches nothing the admin configured
  // must not get into the system at all.
  let roleIds = await resolveOidcRoleIds(await GetEffectiveOidcGroupRoleMappings(), identity.groups);
  if (roleIds.length === 0) {
    // Mirrors SyncOidcUserRoles: an inactive default role is never assigned.
    const defaultRole = settings.default_role_id ? await db.getRoleById(settings.default_role_id) : undefined;
    if (defaultRole?.status === "ACTIVE") {
      roleIds = [settings.default_role_id];
    } else {
      throw new OidcAuthError(
        "not_provisioned",
        `no group mapping matched and no active default role is configured; refusing sub=${identity.sub}`,
      );
    }
  }

  try {
    await db.insertUser({
      email: identity.email,
      name: identity.name,
      password_hash: "",
      role_ids: roleIds,
      auth_provider: GC.AUTH_PROVIDER_OIDC,
      oidc_issuer: identity.issuer,
      oidc_sub: identity.sub,
      oidc_role_ids: roleIds, // provenance: the next sync may revoke exactly these
      is_active: 1,
      is_verified: 1,
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      throw new OidcAuthError("not_provisioned", `insert race for sub=${identity.sub}: ${(e as Error).message}`);
    }
    throw e;
  }

  const created = await db.getUserByOidcIdentity(identity.issuer, identity.sub);
  if (!created) throw new OidcAuthError("auth_failed", "Failed to load the newly created OIDC user");
  return created;
}

/**
 * Recompute what the provider grants the user — the ACTIVE roles their current
 * groups map to, else the active default role — and hand that set to the
 * repository, which applies the difference to the roles the *previous* sync
 * granted (`users.oidc_role_ids`, the provenance record) inside one locked
 * transaction: it removes only previously granted roles that are no longer
 * granted, adds only newly granted ones, and never touches roles an admin
 * assigned by hand. So a deleted or changed mapping revokes the role it used to
 * grant, a manual role stays even if some mapping names it, switching between
 * database and env mappings leaves no stale grants, and a manual change made
 * while a login is in flight is not clobbered by a stale snapshot. The owner
 * account never loses `admin` (passed as `protect`).
 */
export async function SyncOidcUserRoles(
  user: UserRecordPublic,
  oidcGroups: string[],
  settings: OidcSettings,
): Promise<void> {
  const view = await GetEffectiveOidcGroupRoleMappings();
  let oidcRoles = await resolveOidcRoleIds(view, oidcGroups); // ACTIVE-only
  if (oidcRoles.length === 0 && settings.default_role_id) {
    const defaultRole = await db.getRoleById(settings.default_role_id);
    if (defaultRole?.status === "ACTIVE") {
      oidcRoles = [settings.default_role_id];
    }
  }
  await db.applyOidcRoleSync(user.id, {
    oidc_role_ids: oidcRoles,
    protect: user.is_owner === "YES" ? ["admin"] : [],
  });
}

async function syncOidcProfile(user: UserRecordPublic, identity: OidcIdentity): Promise<void> {
  const update: { name?: string; email?: string } = {};
  if (identity.name && identity.name !== user.name) update.name = identity.name;
  if (identity.email !== user.email) {
    const owner = await db.getUserByEmail(identity.email);
    if (!owner || owner.id === user.id) {
      update.email = identity.email;
    } else {
      console.warn(`[oidc] Not updating email of user ${user.id}: the address already belongs to user ${owner.id}`);
    }
  }
  if (Object.keys(update).length === 0) return;

  try {
    await db.updateUserProfile(user.id, update);
  } catch (e) {
    if (update.email && isUniqueViolation(e)) {
      console.warn(`[oidc] The new email was taken concurrently; keeping the old email for user ${user.id}`);
      if (update.name) await db.updateUserProfile(user.id, { name: update.name });
    } else {
      throw e;
    }
  }
}

/**
 * Find the user by `(issuer, sub)`, provisioning on first login (if allowed),
 * then sync roles + profile. Keying on the pair means a changed issuer never
 * resolves a new provider's subject to an account from the previous one.
 */
export async function FindOrCreateOidcUser(settings: OidcSettings, identity: OidcIdentity): Promise<UserRecordPublic> {
  const existing = await db.getUserByOidcIdentity(identity.issuer, identity.sub);
  if (!existing) {
    return await provisionOidcUser(settings, identity);
  }
  await SyncOidcUserRoles(existing, identity.groups, settings);
  await syncOidcProfile(existing, identity);
  const refreshed = await db.getUserByOidcIdentity(identity.issuer, identity.sub);
  if (!refreshed) throw new OidcAuthError("auth_failed", "User disappeared during role sync");
  // The sync above already wrote the (possibly empty) role set so admins can see it in Users;
  // a user left without any active role is denied. `role_ids` is ACTIVE-only.
  if (refreshed.role_ids.length === 0) {
    throw new OidcAuthError("no_roles", `user ${refreshed.id} has no active role after group sync`);
  }
  return refreshed;
}

// ============ Admin: connection test ============

/** Discovery against the given (possibly unsaved) settings. Never touches the shared cache. */
export async function TestOidcConnection(settings: OidcSettings): Promise<{
  success: boolean;
  issuer?: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  userinfoEndpoint?: string;
  error?: string;
}> {
  try {
    const testConfig = await discover(settings);
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
    return { success: false, error: `OIDC Discovery failed: ${message}` };
  }
}

// ============ Admin: settings store & mappings ============

/**
 * Turn an admin-submitted payload (object or JSON string) into the JSON to persist:
 * env-locked fields are dropped (env values are never written to the DB), omitted
 * fields keep their stored value (so an untouched secret survives, as does one
 * echoed back as the mask), unknown keys are ignored, and the result is
 * validated. Throws Error(message) on bad input.
 */
export async function PrepareOidcSettingsForStore(incoming: unknown): Promise<string> {
  let parsed: unknown = incoming;
  if (typeof incoming === "string") {
    try {
      parsed = JSON.parse(incoming);
    } catch {
      throw new Error("Invalid OIDC settings payload");
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid OIDC settings payload");
  }
  const input = parsed as Record<string, unknown>;
  const stored = await readStoredOidcSettings();
  const { locked } = ParseOidcEnvOverrides();

  const next: Record<string, unknown> = { ...stored };
  for (const field of OIDC_FIELDS) {
    if (locked.has(field)) continue;
    if (!(field in input) || input[field] === undefined) continue;
    // The UI omits an untouched secret, but a stale or hand-written client may echo the
    // mask back; that must never replace (or become) the stored secret.
    if (field === "client_secret" && input[field] === OIDC_SECRET_MASK) continue;
    next[field] = input[field];
  }

  const json = JSON.stringify(next);
  if (!IsValidOidcSettings(json)) {
    throw new Error("Invalid OIDC settings");
  }
  const defaultRoleId = next.default_role_id;
  if (typeof defaultRoleId === "string" && defaultRoleId !== "") {
    const role = await db.getRoleById(defaultRoleId);
    if (!role) throw new Error(`Role "${defaultRoleId}" not found`);
  }
  return json;
}

/** Explicit admin actions on the table must fail loudly, not no-op, while the env map owns the mappings. */
function assertGroupRoleMappingsWritable(): void {
  if (ParseOidcGroupRoleMapEnv().active) {
    throw new Error(`Group→role mappings are managed by ${OIDC_GROUP_ROLE_MAP_ENV}`);
  }
}

export async function UpsertOidcGroupRoleMapping(input: { oidc_group?: unknown; role_id?: unknown }): Promise<void> {
  assertGroupRoleMappingsWritable();
  const group = typeof input.oidc_group === "string" ? input.oidc_group.trim() : "";
  if (!group) throw new Error("OIDC group name is required");
  const roleId = typeof input.role_id === "string" ? input.role_id : "";
  if (!roleId) throw new Error("Role ID is required");
  const role = await db.getRoleById(roleId);
  if (!role) throw new Error(`Role "${roleId}" not found`);
  if (role.status !== "ACTIVE") throw new Error(`Role "${roleId}" is not active`);
  await db.upsertOidcGroupRoleMapping({ oidc_group: group, role_id: roleId });
}

export async function DeleteOidcGroupRoleMapping(id: unknown): Promise<void> {
  assertGroupRoleMappingsWritable();
  const numeric = typeof id === "number" ? id : typeof id === "string" && /^\d+$/.test(id) ? Number(id) : Number.NaN;
  if (!Number.isInteger(numeric) || numeric <= 0) throw new Error("Invalid mapping id");
  const deleted = await db.deleteOidcGroupRoleMapping(numeric);
  if (deleted === 0) throw new Error("Mapping not found");
}

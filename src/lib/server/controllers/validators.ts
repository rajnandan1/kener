import { IsOidcHttpAllowed } from "../tool.js";
import { OIDC_SETTINGS_FIELD_TYPES } from "../../types/site.js";

export function IsValidURL(url: string): boolean {
  const regex = /^(https?:\/\/)?((localhost|[\da-z.-]+\.[a-z]{2,10})(:[0-9]{1,5})?)?(\/[\w .-]*)*\/?$/i;
  return regex.test(url);
}

export function IsValidGHObject(data: string): boolean {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(data);
  } catch (error) {
    return false;
  }

  if (typeof parsed !== "object") return false;

  if (!!parsed.apiURL && (typeof parsed.apiURL !== "string" || !IsValidURL(parsed.apiURL))) return false;

  if (!!parsed.owner && typeof parsed.owner !== "string") return false;
  if (!!parsed.repo && typeof parsed.repo !== "string") return false;
  if (!!parsed.incidentSince && isNaN(parsed.incidentSince as number)) return false;
  return true;
}

export function IsValidObject(data: unknown): boolean {
  return typeof data === "object";
}
export function IsValidJSONString(data: string): boolean {
  try {
    JSON.parse(data);
  } catch (error) {
    return false;
  }
  return true;
}

//IsValidJSONArray
export function IsValidJSONArray(data: string): boolean {
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed);
  } catch (error) {
    return false;
  }
}

export function IsValidNav(nav: string): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(nav);
  } catch (error) {
    return false;
  }
  if (!Array.isArray(parsed)) return false;
  if (parsed.length === 0) return true;
  for (const item of parsed) {
    if (!!!item.name || !!!item.url) return false;
  }
  return true;
}

export function IsValidHero(hero: string): boolean {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(hero);
  } catch (error) {
    return false;
  }

  if (typeof parsed !== "object") return false;
  if (!!parsed.title && typeof parsed.title !== "string") return false;
  if (!!parsed.title && typeof parsed.subtitle !== "string") return false;
  return true;
}

export function IsValidFooterHTML(html: unknown): boolean {
  return typeof html === "string";
}

export function IsValidI18n(i18n: string): boolean {
  try {
    JSON.parse(i18n);
  } catch (error) {
    return false;
  }

  return true;
}

export function IsValidAnalytics(analytics: string): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(analytics);
  } catch (error) {
    return false;
  }
  if (!Array.isArray(parsed)) return false;
  for (const item of parsed) {
    if (typeof item.id !== "string") return false;
    if (typeof item.type !== "string") return false;
  }
  return true;
}

export function IsValidColors(colors: string): boolean {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(colors);
  } catch (error) {
    return false;
  }
  if (typeof parsed !== "object") return false;
  const requiredColorKeys = ["UP", "DOWN", "DEGRADED", "MAINTENANCE"];
  for (const key of requiredColorKeys) {
    if (typeof parsed[key] !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(parsed[key] as string)) return false;
  }
  // Optional color keys
  const optionalColorKeys = ["ACCENT", "ACCENT_FOREGROUND"];
  for (const key of optionalColorKeys) {
    if (parsed[key] !== undefined) {
      if (typeof parsed[key] !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(parsed[key] as string)) return false;
    }
  }
  return true;
}

const OIDC_ALL_KEYS = Object.keys(OIDC_SETTINGS_FIELD_TYPES) as (keyof typeof OIDC_SETTINGS_FIELD_TYPES)[];
const OIDC_STRING_KEYS = OIDC_ALL_KEYS.filter((k) => OIDC_SETTINGS_FIELD_TYPES[k] === "string");
const OIDC_BOOLEAN_KEYS = OIDC_ALL_KEYS.filter((k) => OIDC_SETTINGS_FIELD_TYPES[k] === "boolean");
const OIDC_KNOWN_KEYS = new Set<string>(OIDC_ALL_KEYS);

/**
 * Structural validation of the `oidcSettings` site-data value (a JSON string):
 * only known keys, correct types, and — when enabled — an https issuer
 * (http only with KENER_OIDC_ALLOW_HTTP=true), a client_id and the openid scope.
 * Role existence is checked separately (needs the DB).
 */
export function IsValidOidcSettings(value: string): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return false;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
  const o = parsed as Record<string, unknown>;
  for (const key of Object.keys(o)) {
    if (!OIDC_KNOWN_KEYS.has(key)) return false;
  }
  for (const key of OIDC_STRING_KEYS) {
    if (key in o && typeof o[key] !== "string") return false;
  }
  for (const key of OIDC_BOOLEAN_KEYS) {
    if (key in o && typeof o[key] !== "boolean") return false;
  }
  if (o.enabled === true) {
    let issuer: URL;
    try {
      issuer = new URL(typeof o.issuer_url === "string" ? o.issuer_url : "");
    } catch {
      return false;
    }
    if (issuer.protocol !== "https:" && !(issuer.protocol === "http:" && IsOidcHttpAllowed())) return false;
    if (typeof o.client_id !== "string" || o.client_id.trim() === "") return false;
    const scopes = typeof o.scopes === "string" ? o.scopes : "";
    if (!scopes.split(/\s+/).includes("openid")) return false;
  }
  return true;
}

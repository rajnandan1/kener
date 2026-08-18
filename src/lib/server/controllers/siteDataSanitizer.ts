import { MaskOidcSettings } from "./oidcController.js";
import type { OidcSettings } from "../../types/site.js";

/** Site-data keys whose values carry secrets, and how to mask them before they leave the server. */
const SANITIZERS: Record<string, (value: unknown) => unknown> = {
  oidcSettings: (value) => (value && typeof value === "object" ? MaskOidcSettings(value as OidcSettings) : value),
};

/** Mask a single site-data value (already parsed) for delivery to a client. */
export function SanitizeSiteDataValue(key: string, value: unknown): unknown {
  const sanitize = SANITIZERS[key];
  return sanitize ? sanitize(value) : value;
}

/** Site-data keys that must never be written through the generic API-key endpoints (authentication config). */
const API_READ_ONLY_KEYS = new Set<string>(["oidcSettings"]);

/** True when the key may be updated via the public /api/v4/site/{key} endpoint. */
export function IsSiteDataKeyApiWritable(key: string): boolean {
  return !API_READ_ONLY_KEYS.has(key);
}

/** Mask every secret-bearing key of a parsed site-data object. Returns a shallow copy. */
export function SanitizeSiteData<T extends Record<string, unknown>>(data: T): T {
  const copy: Record<string, unknown> = { ...data };
  for (const key of Object.keys(SANITIZERS)) {
    if (key in copy) copy[key] = SanitizeSiteDataValue(key, copy[key]);
  }
  return copy as T;
}

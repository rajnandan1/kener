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

/**
 * Validates the i18n site-data value: `{ defaultLocale, locales: [{ code, name?, selected?,
 * disabled? }] }`.
 *
 * Previously this only asked whether the string parsed as JSON, so `"[]"`, `"null"` and `"42"` were
 * all accepted as configuration and surfaced as a broken locale picker instead of a rejected save.
 *
 * Deliberately NOT enforced: that every entry is `selected`, or that the list contains only enabled
 * locales. The internationalization page writes out every available locale with `selected` false
 * for the ones that are off, so either rule would reject the shape the app itself saves.
 */
export function IsValidI18n(i18n: string): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(i18n);
  } catch (error) {
    return false;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return false;

  const { defaultLocale, locales } = parsed as { defaultLocale?: unknown; locales?: unknown };
  if (typeof defaultLocale !== "string" || defaultLocale.trim() === "") return false;
  if (!Array.isArray(locales) || locales.length === 0) return false;

  const codes = new Set<string>();
  for (const entry of locales) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return false;
    const { code, name, selected, disabled } = entry as Record<string, unknown>;
    if (typeof code !== "string" || code.trim() === "") return false;
    if (name !== undefined && typeof name !== "string") return false;
    if (selected !== undefined && typeof selected !== "boolean") return false;
    if (disabled !== undefined && typeof disabled !== "boolean") return false;
    codes.add(code);
  }

  // A default the picker cannot offer leaves the site with no usable default locale.
  return codes.has(defaultLocale);
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

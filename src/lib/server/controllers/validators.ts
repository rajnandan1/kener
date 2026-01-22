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
  const validColorKeys = ["UP", "DOWN", "DEGRADED", "MAINTENANCE"];
  for (const key of validColorKeys) {
    if (typeof parsed[key] !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(parsed[key] as string)) return false;
  }
  return true;
}

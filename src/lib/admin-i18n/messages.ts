import english from "./en.json";
import { getAdminLanguage, isAdminLocale, type AdminLocale } from "./languages";

export type { AdminLocale } from "./languages";
export type AdminMessageValues = Record<string, string | number>;

const fallbackMessages: Record<string, string> = english;
const normalize = (message: string): string => message.replace(/\s+/g, " ").trim();
const placeholder = /\{([a-zA-Z][a-zA-Z0-9_]*)\}/g;
const patterns = Object.keys(english)
  .filter((message) => /\{[a-zA-Z][a-zA-Z0-9_]*\}/.test(message))
  .sort((a, b) => b.length - a.length)
  .map((message) => {
    const names: string[] = [];
    const escaped = message.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const expression = escaped.replace(/\\\{([a-zA-Z][a-zA-Z0-9_]*)\\\}/g, (_, name: string) => {
      names.push(name);
      return "([\\s\\S]*?)";
    });
    return { message, names, expression: new RegExp("^" + expression.replace(/\s+/g, "\\s+") + "$") };
  });

function interpolate(message: string, values: AdminMessageValues): string {
  return message.replace(placeholder, (token, name: string) =>
    !Object.hasOwn(values, name) || values[name] === undefined ? token : String(values[name]),
  );
}

/** Pure formatting; values are rendered as text by Svelte, never interpreted as HTML. */
export function translateAdmin(locale: AdminLocale, message: string, values: AdminMessageValues = {}): string {
  if (typeof message !== "string" || !message) return message;
  const key = normalize(message);
  const dictionary: Record<string, string> = getAdminLanguage(locale).messages;
  const direct = Object.hasOwn(dictionary, key)
    ? dictionary[key]
    : Object.hasOwn(fallbackMessages, key)
      ? fallbackMessages[key]
      : undefined;
  if (direct !== undefined) return interpolate(direct, values);
  if (locale !== "en") {
    for (const pattern of patterns) {
      const match = message.match(pattern.expression);
      if (!match) continue;
      const extracted: AdminMessageValues = { ...values };
      pattern.names.forEach((name, index) => {
        extracted[name] = match[index + 1];
      });
      return interpolate(dictionary[pattern.message] ?? pattern.message, extracted);
    }
  }
  return interpolate(message, values);
}

export function resolveAdminLocale(cookie: string | undefined, acceptLanguage: string | null | undefined): AdminLocale {
  if (isAdminLocale(cookie)) return cookie;
  const languages = (acceptLanguage ?? "")
    .split(",")
    .map((item, order) => {
      const [tag, ...parameters] = item.trim().toLowerCase().split(";");
      const quality = parameters.find((part) => part.trim().startsWith("q="));
      const q = quality === undefined ? 1 : Number(quality.trim().slice(2));
      return { tag, q: Number.isFinite(q) && q >= 0 && q <= 1 ? q : 0, order };
    })
    .filter((item) => item.q > 0)
    .sort((a, b) => b.q - a.q || a.order - b.order);
  for (const language of languages) {
    let tag = language.tag;
    while (tag) {
      if (isAdminLocale(tag)) return tag;
      const separator = tag.lastIndexOf("-");
      tag = separator < 0 ? "" : tag.slice(0, separator);
    }
  }
  return "en";
}

export function adminLocaleTag(locale: AdminLocale): string {
  return getAdminLanguage(locale).localeTag;
}

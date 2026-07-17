import { resolve } from "$app/paths";
import clientResolver from "$lib/client/resolver.js";
import { availableLocalesList } from "$lib/stores/i18n";

export interface TranslatableLocalesInfo {
  defaultLocaleName: string;
  locales: { code: string; name: string }[];
}

/**
 * Enabled locales minus the site default — the set an admin can author
 * content translations for. Empty when only the default language is enabled.
 */
export async function fetchTranslatableLocales(): Promise<TranslatableLocalesInfo> {
  const response = await fetch(clientResolver(resolve, "/manage/api"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "getAllSiteData" }),
  });
  const result = await response.json();
  const names = new Map(availableLocalesList.map((l) => [l.code, l.name]));
  const defaultLocale: string = result?.i18n?.defaultLocale || "en";
  const enabled: { code: string; name?: string; selected?: boolean }[] = result?.i18n?.locales || [];
  return {
    defaultLocaleName: names.get(defaultLocale) ?? defaultLocale,
    locales: enabled
      .filter((l) => l.selected && l.code !== defaultLocale)
      .map((l) => ({ code: l.code, name: names.get(l.code) ?? l.name ?? l.code })),
  };
}

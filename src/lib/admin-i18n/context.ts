import { getContext, setContext } from "svelte";
import { derived, readable, writable, type Readable, type Writable } from "svelte/store";
import { base } from "$app/paths";
import { translateAdmin, type AdminLocale, type AdminMessageValues } from "./messages";

export type { AdminLocale } from "./messages";
export type AdminTranslator = (message: string, values?: AdminMessageValues) => string;
export interface AdminI18nContext {
  active: boolean;
  locale: Readable<AdminLocale>;
  t: Readable<AdminTranslator>;
  editorPhrases: Readable<Record<string, string>>;
  setLocale: (locale: AdminLocale) => void;
}
const contextKey = Symbol("kener-admin-i18n");
const editorPhraseKeys = [
  "Find",
  "Search",
  "Replace",
  "next",
  "previous",
  "all",
  "match case",
  "regexp",
  "by word",
  "replace",
  "replace all",
  "close",
  "Go to line",
  "go",
  "current match",
  "on line",
  "replaced match on line $",
  "replaced $ matches",
  "Selection deleted",
  "Diagnostics",
  "No diagnostics",
  "Completions",
  "Control character",
  "Fold line",
  "Unfold line",
  "to",
  "folded code",
  "unfold",
  "Folded lines",
  "Unfolded lines",
];
function phrases(translate: AdminTranslator): Record<string, string> {
  return Object.fromEntries(editorPhraseKeys.map((key) => [key, translate(key)]));
}
const fallback: AdminI18nContext = {
  active: false,
  locale: readable<AdminLocale>("en"),
  t: readable<AdminTranslator>((message, values) => translateAdmin("en", message, values)),
  editorPhrases: readable(phrases((message) => message)),
  setLocale: () => {},
};

/** Each layout owns its state, including during concurrent server rendering. */
export function createAdminI18n(initialLocale: AdminLocale): AdminI18nContext {
  const locale: Writable<AdminLocale> = writable(initialLocale);
  const t = derived(
    locale,
    ($locale): AdminTranslator =>
      (message, values) =>
        translateAdmin($locale, message, values),
  );
  const result: AdminI18nContext = {
    active: true,
    locale,
    t,
    editorPhrases: derived(t, ($t) => phrases($t)),
    setLocale(value) {
      if (value !== "pl" && value !== "en") return;
      locale.set(value);
      if (typeof document !== "undefined") {
        const secure = window.location.protocol === "https:" ? "; Secure" : "";
        document.cookie = `kener_admin_locale=${value}; Path=${base || "/"}; Max-Age=31536000; SameSite=Lax${secure}`;
      }
    },
  };
  setContext(contextKey, result);
  return result;
}

/** Shared components retain their original English behavior outside admin/account layouts. */
export function getAdminI18n(): AdminI18nContext {
  return getContext<AdminI18nContext>(contextKey) ?? fallback;
}

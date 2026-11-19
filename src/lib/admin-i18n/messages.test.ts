import { describe, expect, it, vi } from "vitest";
import { readdirSync } from "node:fs";
import english from "./en.json";
import polish from "./pl.json";
import { adminLocaleTag, resolveAdminLocale, translateAdmin } from "./messages";
import { formatAdminDate, formatAdminDuration, formatAdminRelative } from "./formatters";
import { getAlertText } from "$lib/alerts/alert-text";
import { adminLanguages, getAdminLanguage, isAdminLocale } from "./languages";

const tokens = (value: string) => [...value.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map((match) => match[1]).sort();

describe("administrative language catalogues", () => {
  it("has the same complete set of nonempty Polish and English messages", () => {
    expect(Object.keys(polish).sort()).toEqual(Object.keys(english).sort());
    for (const [key, value] of Object.entries(polish)) {
      expect(value.trim(), key).not.toBe("");
      expect(value, key).not.toMatch(/TODO|TRANSLATE_ME|\[untranslated\]/);
      expect(tokens(value), key).toEqual(tokens(english[key as keyof typeof english]));
    }
  });
  it("uses reviewed Polish terminology instead of literal machine translations", () => {
    expect(translateAdmin("pl", "Save")).toBe("Zapisz");
    expect(translateAdmin("pl", "Latency")).toBe("Opóźnienie");
    expect(translateAdmin("pl", "Uptime")).toBe("Dostępność");
    expect(translateAdmin("pl", "Triggers")).toBe("Kanały powiadomień");
  });
  it("provides Czech interface terminology while preserving values and diagnostics", () => {
    expect(translateAdmin("cs", "Save")).toBe("Uložit");
    expect(translateAdmin("cs", "Latency")).toBe("Odezva");
    expect(translateAdmin("cs", "Uptime")).toBe("Dostupnost");
    const name = "<script>$&</script>";
    expect(translateAdmin("cs", "Welcome, {name}!", { name })).toContain(name);
    const diagnostic = "bad  value\nat line 2";
    expect(translateAdmin("cs", `Eval error: ${diagnostic}`)).toContain(diagnostic);
    expect(translateAdmin("cs", "External diagnostic 721")).toBe("External diagnostic 721");
  });
  it("keeps fallback English and independent calls intact", () => {
    expect(translateAdmin("pl", "  Save \n")).toBe("Zapisz");
    expect(translateAdmin("en", "Save")).toBe("Save");
    expect(translateAdmin("pl", "constructor")).toBe("constructor");
    expect(translateAdmin("pl", "__proto__")).toBe("__proto__");
    expect(translateAdmin("pl", "External diagnostic 721")).toBe("External diagnostic 721");
    expect(translateAdmin("en", "Save")).toBe("Save");
  });
  it("interpolates values as literal text, retaining dollar signs and markup", () => {
    expect(translateAdmin("pl", "Welcome, {name}!", { name: "<script>$&</script>" })).toBe(
      "Witaj, <script>$&</script>!",
    );
    expect(translateAdmin("pl", "replaced $ matches")).toBe("liczba zamian: $");
  });
  it("localizes existing dynamic server messages at their display boundary", () => {
    expect(translateAdmin("pl", "A user with email admin@example.test already exists")).toBe(
      "Użytkownik o adresie e-mail admin@example.test już istnieje",
    );
    expect(translateAdmin("pl", "Incident with id 123 not found")).toBe(
      "Nie znaleziono incydentu o identyfikatorze 123",
    );
    expect(translateAdmin("pl", "timezone 'Invalid/Zone' is not a known IANA time zone")).toBe(
      "Strefa czasowa „Invalid/Zone” nie jest znaną strefą IANA",
    );
  });
  it("localizes known diagnostic messages without changing machine values", () => {
    expect(translateAdmin("pl", "No heartbeat received yet")).toBe("Nie odebrano jeszcze sygnału aktywności");
    expect(translateAdmin("pl", "Container is exited with exit code 0")).toBe("Stan kontenera: exited; kod wyjścia: 0");
    expect(translateAdmin("pl", "No heartbeat received in the last 5 minutes")).toBe(
      "Nie odebrano sygnału aktywności w ostatnich 5 min",
    );
    expect(
      translateAdmin("pl", "SSL certificate for example.test expired at 2026-11-01T00:00:00Z. Issued by CN=Example CA"),
    ).toBe("Certyfikat SSL dla example.test wygasł: 2026-11-01T00:00:00Z. Wystawca: CN=Example CA");
    expect(translateAdmin("pl", "tcpEval did not return status or latency.")).toBe(
      "tcpEval nie zwrócił statusu lub opóźnienia.",
    );
  });
  it("preserves spaces and line breaks in expanded and explicit diagnostics", () => {
    const diagnostic = "bad  value\nat line 2\n  with indentation";
    expect(translateAdmin("pl", `Eval error: ${diagnostic}`)).toBe(`Błąd skryptu oceny: ${diagnostic}`);
    expect(translateAdmin("pl", "Eval error: {value0}", { value0: diagnostic })).toBe(
      `Błąd skryptu oceny: ${diagnostic}`,
    );
    expect(translateAdmin("en", `Eval error: ${diagnostic}`)).toBe(`Eval error: ${diagnostic}`);
  });
  it("preserves missing interpolation tokens for diagnosis instead of hiding data", () => {
    expect(translateAdmin("pl", "Welcome, {name}!")).toContain("{name}");
  });
  it("localizes real alert descriptions without changing technical conditions", () => {
    for (const type of ["STATUS", "LATENCY", "UPTIME"]) {
      const source = getAlertText({
        kind: "description",
        alert_for: type,
        alert_value: type === "STATUS" ? "DOWN" : 15,
        failure_threshold: 3,
        success_threshold: 2,
      });
      const result = translateAdmin("pl", source);
      expect(result).toContain("Warunek alertu:");
      expect(result).toContain("3");
      expect(result).toContain("2");
      if (type === "STATUS") expect(result).toContain("DOWN");
      expect(translateAdmin("en", source)).toBe(source);
    }
  });
});

describe("administrative locale resolution", () => {
  it("prefers an explicit panel cookie over the public/browser language", () => {
    expect(resolveAdminLocale("pl", "en-US,en;q=0.9")).toBe("pl");
    expect(resolveAdminLocale("en", "pl-PL,pl;q=0.9")).toBe("en");
  });
  it("handles language regions, ordering and quality weights", () => {
    expect(resolveAdminLocale(undefined, "en-US;q=0.4,pl-PL;q=0.9")).toBe("pl");
    expect(resolveAdminLocale(undefined, "de-DE,en-GB;q=0.8,pl;q=0.3")).toBe("en");
    expect(resolveAdminLocale(undefined, "en;q=0,pl;q=0.1")).toBe("pl");
    expect(resolveAdminLocale(undefined, "en;q=invalid,pl;q=0.5")).toBe("pl");
  });
  it("resolves Czech cookies and weighted browser preferences independently", () => {
    expect(resolveAdminLocale("cs", "pl-PL,en;q=0.9")).toBe("cs");
    expect(resolveAdminLocale(undefined, "en-US;q=0.4,cs-CZ;q=0.9,pl;q=0.7")).toBe("cs");
    expect(resolveAdminLocale("en", "cs-CZ")).toBe("en");
    expect(resolveAdminLocale(undefined, "cs;q=0,en;q=0.9")).toBe("en");
    expect(adminLocaleTag("cs")).toBe("cs-CZ");
  });
  it("rejects unsupported preferences and falls back to English", () => {
    expect(resolveAdminLocale("../en", null)).toBe("en");
    expect(resolveAdminLocale(undefined, "de,fr")).toBe("en");
    expect(resolveAdminLocale(undefined, undefined)).toBe("en");
    expect(resolveAdminLocale(undefined, "pl;q=0,fr;q=1")).toBe("en");
    expect(adminLocaleTag("en")).toBe("en-GB");
    expect(adminLocaleTag("pl")).toBe("pl-PL");
  });
});

describe("display-only dates and durations", () => {
  it("formats Polish durations, including invalid values", () => {
    expect(formatAdminDuration(65, "pl")).toContain("min");
    expect(formatAdminDuration(3660, "pl")).toContain("godz.");
    expect(formatAdminDuration(-1, "pl")).toBe("—");
    expect(formatAdminDuration(Number.NaN, "pl")).toBe("—");
  });
  it("uses a selected display timezone without modifying source timestamps", () => {
    const value = new Date("2026-11-15T12:00:00Z");
    const stamp = value.getTime();
    expect(formatAdminDate(value, "pl", "Europe/Warsaw")).toContain("13:00");
    expect(value.getTime()).toBe(stamp);
  });
  it("uses Polish and English relative units independently", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-11-15T12:00:00Z"));
      expect(formatAdminRelative(new Date("2026-11-15T11:57:00Z"), "pl")).toBe("3 minuty");
      expect(formatAdminRelative(new Date("2026-11-15T11:57:00Z"), "en")).toBe("3 minutes");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("registered panel languages", () => {
  it("registers every catalogue with a native label and matching complete messages", () => {
    const files = readdirSync(new URL(".", import.meta.url))
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.slice(0, -5))
      .sort();
    expect(adminLanguages.map((language) => language.code).sort()).toEqual(files);
    for (const language of adminLanguages) {
      expect(language.label.trim()).not.toBe("");
      expect(Intl.getCanonicalLocales(language.localeTag)).toHaveLength(1);
      expect(Object.keys(language.messages).sort()).toEqual(Object.keys(english).sort());
      for (const [key, value] of Object.entries(language.messages)) {
        expect(value.trim(), `${language.code}: ${key}`).not.toBe("");
        expect(tokens(value)).toEqual(tokens(key));
      }
    }
  });
  it("uses each registration for resolution, translations and formatting", () => {
    for (const language of adminLanguages) {
      expect(isAdminLocale(language.code)).toBe(true);
      expect(resolveAdminLocale(language.code, null)).toBe(language.code);
      expect(resolveAdminLocale(undefined, language.localeTag)).toBe(language.code);
      expect(adminLocaleTag(language.code)).toBe(language.localeTag);
      expect(getAdminLanguage(language.code).dateLocale).toBe(language.dateLocale);
      expect(translateAdmin(language.code, "Save")).toBe(language.messages.Save);
    }
    expect(isAdminLocale("constructor")).toBe(false);
    expect(isAdminLocale("__proto__")).toBe(false);
    expect(isAdminLocale("../en")).toBe(false);
  });
});

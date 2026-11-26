import { describe, expect, it } from "vitest";
import { get } from "svelte/store";
import { i18n, tc, TranslateContent } from "./i18n";

const contentTranslations = {
  nl: { Facturation: "Facturatie", "Site web": "Website" },
  en: { Facturation: "Invoicing", "Site web": "  " },
};

describe("TranslateContent", () => {
  it("returns the translation for the locale", () => {
    expect(TranslateContent(contentTranslations, "nl", "Facturation")).toBe("Facturatie");
    expect(TranslateContent(contentTranslations, "en", "Facturation")).toBe("Invoicing");
  });

  it("matches the typed text without its surrounding spaces", () => {
    expect(TranslateContent(contentTranslations, "nl", "  Facturation ")).toBe("Facturatie");
  });

  it("returns the text unchanged when there is no usable translation", () => {
    expect(TranslateContent(contentTranslations, "fr", "Facturation")).toBe("Facturation");
    expect(TranslateContent(contentTranslations, "nl", "Stockage")).toBe("Stockage");
    expect(TranslateContent(contentTranslations, "en", "Site web")).toBe("Site web");
    expect(TranslateContent(undefined, "nl", "Facturation")).toBe("Facturation");
  });

  it("returns an empty string for a missing text", () => {
    expect(TranslateContent(contentTranslations, "nl", undefined)).toBe("");
    expect(TranslateContent(contentTranslations, "nl", null)).toBe("");
  });
});

describe("tc store", () => {
  it("follows the current locale", async () => {
    const locales = [
      { code: "fr", name: "Français" },
      { code: "nl", name: "Nederlands" },
    ];
    await i18n.init(locales, "fr", fetch, contentTranslations);
    expect(get(tc)("Facturation")).toBe("Facturation");

    await i18n.setLocale("nl");
    expect(get(tc)("Facturation")).toBe("Facturatie");
    i18n.reset();
  });
});

import { describe, expect, it } from "vitest";
import { IsValidI18n } from "./validators";

describe("IsValidI18n", () => {
  const base = { defaultLocale: "fr", locales: [{ code: "fr", name: "Français", selected: true, disabled: false }] };

  it("accepts a setting without content translations", () => {
    expect(IsValidI18n(JSON.stringify(base))).toBe(true);
  });

  it("accepts content translations keyed by locale, then by typed text", () => {
    const value = { ...base, contentTranslations: { nl: { Facturation: "Facturatie" }, en: {} } };
    expect(IsValidI18n(JSON.stringify(value))).toBe(true);
  });

  it("rejects invalid JSON", () => {
    expect(IsValidI18n("{")).toBe(false);
  });

  it("rejects content translations of the wrong shape", () => {
    for (const contentTranslations of [[], "nl", { nl: ["Facturatie"] }, { nl: null }, { nl: { Facturation: 1 } }]) {
      expect(IsValidI18n(JSON.stringify({ ...base, contentTranslations }))).toBe(false);
    }
  });
});

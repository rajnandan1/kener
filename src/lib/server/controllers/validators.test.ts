import { describe, expect, it } from "vitest";
import { IsValidI18n } from "./validators";

/**
 * The i18n site-data value drives the public locale picker and, through
 * fetchTranslatableLocales(), which locales an admin can author content translations for. Until
 * now IsValidI18n only asked whether the string parsed as JSON, so `"[]"`, `"null"` and `"42"` all
 * counted as valid configuration.
 *
 * The shape the admin UI writes is the contract these rules must not break: every available locale
 * is written out, each carrying code/name/selected/disabled, with `selected` false for the ones
 * that are off. So a valid value is NOT "only enabled locales" and entries must not be required to
 * be selected.
 */
describe("IsValidI18n", () => {
  const uiShape = (defaultLocale = "en") =>
    JSON.stringify({
      defaultLocale,
      locales: [
        { code: "en", name: "English", selected: true, disabled: false },
        { code: "de", name: "Deutsch", selected: true, disabled: false },
        { code: "fr", name: "Français", selected: false, disabled: false },
      ],
    });

  it("accepts the shape the internationalization page saves", () => {
    expect(IsValidI18n(uiShape())).toBe(true);
  });

  it("accepts a minimal value carrying only the fields that are read", () => {
    expect(IsValidI18n(JSON.stringify({ defaultLocale: "en", locales: [{ code: "en" }] }))).toBe(true);
  });

  it("accepts entries whose optional fields are present and well-typed", () => {
    const value = JSON.stringify({
      defaultLocale: "de",
      locales: [{ code: "de", name: "Deutsch", selected: true, disabled: false }],
    });
    expect(IsValidI18n(value)).toBe(true);
  });

  it("rejects a string that is not JSON", () => {
    expect(IsValidI18n("not json")).toBe(false);
  });

  it("rejects JSON that is not an object", () => {
    expect(IsValidI18n("[]")).toBe(false);
    expect(IsValidI18n("null")).toBe(false);
    expect(IsValidI18n("42")).toBe(false);
    expect(IsValidI18n('"en"')).toBe(false);
  });

  it("rejects a missing or empty defaultLocale", () => {
    expect(IsValidI18n(JSON.stringify({ locales: [{ code: "en" }] }))).toBe(false);
    expect(IsValidI18n(JSON.stringify({ defaultLocale: "", locales: [{ code: "en" }] }))).toBe(false);
    expect(IsValidI18n(JSON.stringify({ defaultLocale: "   ", locales: [{ code: "en" }] }))).toBe(false);
  });

  it("rejects a non-string defaultLocale", () => {
    expect(IsValidI18n(JSON.stringify({ defaultLocale: 1, locales: [{ code: "en" }] }))).toBe(false);
  });

  it("rejects a missing, non-array or empty locales list", () => {
    expect(IsValidI18n(JSON.stringify({ defaultLocale: "en" }))).toBe(false);
    expect(IsValidI18n(JSON.stringify({ defaultLocale: "en", locales: {} }))).toBe(false);
    expect(IsValidI18n(JSON.stringify({ defaultLocale: "en", locales: [] }))).toBe(false);
  });

  it("rejects a locales entry that is not an object with a usable code", () => {
    expect(IsValidI18n(JSON.stringify({ defaultLocale: "en", locales: ["en"] }))).toBe(false);
    expect(IsValidI18n(JSON.stringify({ defaultLocale: "en", locales: [{ name: "English" }] }))).toBe(false);
    expect(IsValidI18n(JSON.stringify({ defaultLocale: "en", locales: [{ code: "" }] }))).toBe(false);
    expect(IsValidI18n(JSON.stringify({ defaultLocale: "en", locales: [{ code: 42 }] }))).toBe(false);
  });

  it("rejects a defaultLocale that is not among the listed locales", () => {
    expect(IsValidI18n(uiShape("ja"))).toBe(false);
  });

  it("rejects an optional field of the wrong type", () => {
    const selectedAsString = JSON.stringify({
      defaultLocale: "en",
      locales: [{ code: "en", selected: "true" }],
    });
    expect(IsValidI18n(selectedAsString)).toBe(false);
  });
});

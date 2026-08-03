import { describe, expect, it } from "vitest";
import { parseContentTranslations, resolveTranslation } from "./content-i18n";

describe("parseContentTranslations", () => {
  it("returns objects as-is", () => {
    expect(parseContentTranslations({ de: { name: "Webseite" } })).toEqual({ de: { name: "Webseite" } });
  });

  it("parses JSON strings", () => {
    expect(parseContentTranslations('{"de":{"name":"Webseite"}}')).toEqual({ de: { name: "Webseite" } });
  });

  it("returns null for null, undefined and empty strings", () => {
    expect(parseContentTranslations(null)).toBeNull();
    expect(parseContentTranslations(undefined)).toBeNull();
    expect(parseContentTranslations("")).toBeNull();
    expect(parseContentTranslations("   ")).toBeNull();
  });

  it("returns null for malformed JSON and non-object values", () => {
    expect(parseContentTranslations("{not json")).toBeNull();
    expect(parseContentTranslations("42")).toBeNull();
    expect(parseContentTranslations('["a"]')).toBeNull();
    expect(parseContentTranslations(7)).toBeNull();
  });
});

describe("resolveTranslation", () => {
  const translations = { de: { name: "Webseite", description: "" }, fr: { name: "Site web" } };

  it("returns the translated value on locale + field hit", () => {
    expect(resolveTranslation(translations, "de", "name", "Website")).toBe("Webseite");
    expect(resolveTranslation(translations, "fr", "name", "Website")).toBe("Site web");
  });

  it("falls back on locale miss", () => {
    expect(resolveTranslation(translations, "es", "name", "Website")).toBe("Website");
  });

  it("falls back on field miss", () => {
    expect(resolveTranslation(translations, "fr", "description", "Base desc")).toBe("Base desc");
  });

  it("falls back on empty or whitespace-only values", () => {
    expect(resolveTranslation(translations, "de", "description", "Base desc")).toBe("Base desc");
    expect(resolveTranslation({ de: { name: "   " } }, "de", "name", "Website")).toBe("Website");
  });

  it("falls back on null/undefined/malformed translations input", () => {
    expect(resolveTranslation(null, "de", "name", "Website")).toBe("Website");
    expect(resolveTranslation(undefined, "de", "name", "Website")).toBe("Website");
    expect(resolveTranslation("{broken", "de", "name", "Website")).toBe("Website");
  });

  it("resolves translations passed as a JSON string", () => {
    expect(resolveTranslation('{"de":{"name":"Webseite"}}', "de", "name", "Website")).toBe("Webseite");
  });

  it("falls back when a locale entry or value has the wrong shape", () => {
    expect(resolveTranslation({ de: "oops" } as never, "de", "name", "Website")).toBe("Website");
    expect(resolveTranslation({ de: { name: 42 } } as never, "de", "name", "Website")).toBe("Website");
  });
});

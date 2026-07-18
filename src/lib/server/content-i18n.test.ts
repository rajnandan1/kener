import { describe, expect, it } from "vitest";
import {
  INCIDENT_TRANSLATABLE_FIELDS,
  MAINTENANCE_TRANSLATABLE_FIELDS,
  MONITOR_TRANSLATABLE_FIELDS,
  resolveTranslationsForUpdate,
  serializeContentTranslations,
  validateContentTranslations,
} from "./content-i18n";

describe("validateContentTranslations", () => {
  it("accepts valid translations for shipped locales and allowed fields", () => {
    expect(
      validateContentTranslations({ de: { name: "Webseite" }, fr: { name: "Site web" } }, MONITOR_TRANSLATABLE_FIELDS),
    ).toEqual({ de: { name: "Webseite" }, fr: { name: "Site web" } });
  });

  it("returns null for null/undefined/empty input", () => {
    expect(validateContentTranslations(null, MONITOR_TRANSLATABLE_FIELDS)).toBeNull();
    expect(validateContentTranslations(undefined, MONITOR_TRANSLATABLE_FIELDS)).toBeNull();
    expect(validateContentTranslations({}, MONITOR_TRANSLATABLE_FIELDS)).toBeNull();
    expect(validateContentTranslations("", MONITOR_TRANSLATABLE_FIELDS)).toBeNull();
  });

  it("accepts already-serialized JSON strings (idempotent write path)", () => {
    expect(validateContentTranslations('{"de":{"title":"Wartung"}}', MAINTENANCE_TRANSLATABLE_FIELDS)).toEqual({
      de: { title: "Wartung" },
    });
  });

  it("rejects locales Kener does not ship", () => {
    expect(() => validateContentTranslations({ xx: { name: "Nope" } }, MONITOR_TRANSLATABLE_FIELDS)).toThrow(
      /unknown locale/i,
    );
  });

  it("rejects fields outside the entity's allowed set", () => {
    expect(() => validateContentTranslations({ de: { comment: "Hi" } }, INCIDENT_TRANSLATABLE_FIELDS)).toThrow(
      /not translatable/i,
    );
  });

  it("rejects non-string values and non-object shapes", () => {
    expect(() => validateContentTranslations({ de: { name: 42 } }, MONITOR_TRANSLATABLE_FIELDS)).toThrow(
      /must be a string/i,
    );
    expect(() => validateContentTranslations({ de: "oops" }, MONITOR_TRANSLATABLE_FIELDS)).toThrow(/object/i);
    expect(() => validateContentTranslations(["de"], MONITOR_TRANSLATABLE_FIELDS)).toThrow(/object/i);
    expect(() => validateContentTranslations("{broken", MONITOR_TRANSLATABLE_FIELDS)).toThrow(/JSON/i);
  });

  it("enforces length caps (255 for name/title, 65535 for description/comment)", () => {
    expect(() => validateContentTranslations({ de: { name: "x".repeat(256) } }, MONITOR_TRANSLATABLE_FIELDS)).toThrow(
      /255/,
    );
    expect(validateContentTranslations({ de: { name: "x".repeat(255) } }, MONITOR_TRANSLATABLE_FIELDS)).toEqual({
      de: { name: "x".repeat(255) },
    });
    expect(() =>
      validateContentTranslations({ de: { description: "x".repeat(65536) } }, MONITOR_TRANSLATABLE_FIELDS),
    ).toThrow(/65535/);
  });

  it("drops empty/whitespace-only values and empty locales", () => {
    expect(
      validateContentTranslations(
        { de: { name: "  ", description: "Echt" }, fr: { name: "" } },
        MONITOR_TRANSLATABLE_FIELDS,
      ),
    ).toEqual({ de: { description: "Echt" } });
    expect(validateContentTranslations({ de: { name: "   " } }, MONITOR_TRANSLATABLE_FIELDS)).toBeNull();
  });
});

describe("serializeContentTranslations", () => {
  it("stringifies validated translations", () => {
    expect(serializeContentTranslations({ de: { name: "Webseite" } }, MONITOR_TRANSLATABLE_FIELDS)).toBe(
      '{"de":{"name":"Webseite"}}',
    );
  });

  it("returns null when nothing survives validation", () => {
    expect(serializeContentTranslations(null, MONITOR_TRANSLATABLE_FIELDS)).toBeNull();
    expect(serializeContentTranslations({ de: { name: " " } }, MONITOR_TRANSLATABLE_FIELDS)).toBeNull();
  });
});

describe("resolveTranslationsForUpdate", () => {
  it("keeps the existing raw string when incoming is undefined", () => {
    expect(resolveTranslationsForUpdate(undefined, '{"de":{"name":"Webseite"}}', MONITOR_TRANSLATABLE_FIELDS)).toBe(
      '{"de":{"name":"Webseite"}}',
    );
  });

  it("returns null when incoming is undefined and there is no existing value", () => {
    expect(resolveTranslationsForUpdate(undefined, null, MONITOR_TRANSLATABLE_FIELDS)).toBeNull();
    expect(resolveTranslationsForUpdate(undefined, undefined, MONITOR_TRANSLATABLE_FIELDS)).toBeNull();
  });

  it("clears translations when incoming is explicitly null, even if an existing value is present", () => {
    expect(resolveTranslationsForUpdate(null, '{"de":{"name":"Webseite"}}', MONITOR_TRANSLATABLE_FIELDS)).toBeNull();
  });

  it("serializes an incoming object regardless of what existed before", () => {
    expect(
      resolveTranslationsForUpdate({ de: { name: "Neu" } }, '{"de":{"name":"Alt"}}', MONITOR_TRANSLATABLE_FIELDS),
    ).toBe('{"de":{"name":"Neu"}}');
  });

  it("throws when incoming is an invalid object, regardless of existing value", () => {
    expect(() => resolveTranslationsForUpdate({ de: { comment: "Hi" } }, null, MONITOR_TRANSLATABLE_FIELDS)).toThrow(
      /not translatable/i,
    );
  });
});

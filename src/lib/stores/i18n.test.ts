import { describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";
import { t } from "./i18n";

describe("t placeholder interpolation", () => {
  it("replaces placeholders in translated keys", () => {
    // Default store state has no translations loaded; this exercises the fallback path below.
    const translate = get(t);
    // Silence console.warn for this test as it intentionally exercises the missing-translation path
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(translate("Hello %name", { name: "World" })).toBe("Hello World");
    warnSpy.mockRestore();
  });

  it("replaces placeholders even when the key has no translation (fallback)", () => {
    const translate = get(t);
    // Silence console.warn for this test as it intentionally exercises the missing-translation path
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(translate("Avg %name", { name: "Queue length" })).toBe("Avg Queue length");
    warnSpy.mockRestore();
  });

  it("leaves unknown placeholders untouched", () => {
    const translate = get(t);
    // Silence console.warn for this test as it intentionally exercises the missing-translation path
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(translate("Avg %name", {})).toBe("Avg %name");
    warnSpy.mockRestore();
  });
});

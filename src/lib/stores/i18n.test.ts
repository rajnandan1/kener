import { describe, expect, it } from "vitest";
import { get } from "svelte/store";
import { i18n, lt } from "./i18n";

describe("lt derived store", () => {
  it("resolves against the active locale and falls back to the base text", async () => {
    await i18n.init(
      [
        { code: "en", name: "English" },
        { code: "de", name: "Deutsch" },
      ],
      "en",
      globalThis.fetch,
    );
    const translations = { de: { name: "Webseite" } };

    expect(get(lt)(translations, "name", "Website")).toBe("Website");

    await i18n.setLocale("de");
    expect(get(lt)(translations, "name", "Webseite-fallback")).toBe("Webseite");
    expect(get(lt)(translations, "description", "Base description")).toBe("Base description");
    expect(get(lt)(null, "name", "Website")).toBe("Website");
  });
});

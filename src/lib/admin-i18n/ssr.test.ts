import { describe, expect, it } from "vitest";
import { render } from "svelte/server";
import { get } from "svelte/store";
import type { AdminI18nContext } from "./context";
import Harness from "./AdminI18n.harness.svelte";

describe("administrative SSR context", () => {
  it("renders Polish without translating user-authored data", () => {
    const result = render(Harness, { props: { initialLocale: "pl", userText: "Save" } });
    expect(result.body).toContain('data-testid="translated">Zapisz');
    expect(result.body).toContain('data-testid="user-text">Save');
  });
  it("keeps alternating requests in separate languages without an SSR singleton", async () => {
    const results = await Promise.all(
      ["pl", "en", "pl", "en"].map(
        async (initialLocale) =>
          render(Harness, { props: { initialLocale: initialLocale as "pl" | "en", userText: "<script>test</script>" } })
            .body,
      ),
    );
    for (let i = 0; i < results.length; i++) {
      expect(results[i]).toContain('data-testid="translated">' + (i % 2 === 0 ? "Zapisz" : "Save"));
      expect(results[i]).toContain("&lt;script>");
      expect(results[i]).not.toContain("<script>test</script>");
    }
  });
  it("keeps retained context lifetimes isolated when either locale changes", () => {
    const contexts: AdminI18nContext[] = [];
    for (const initialLocale of ["pl", "en"] as const) {
      const result = render(Harness, { props: { initialLocale, onContext: (context) => contexts.push(context) } });
      expect(result.body).toContain('data-testid="translated"');
    }
    const [polish, english] = contexts;
    expect(polish).not.toBe(english);
    expect(get(polish.t)("Save")).toBe("Zapisz");
    expect(get(english.t)("Save")).toBe("Save");
    polish.setLocale("en");
    expect(get(english.locale)).toBe("en");
    expect(get(english.t)("Save")).toBe("Save");
    english.setLocale("pl");
    expect(get(polish.locale)).toBe("en");
    expect(get(polish.t)("Save")).toBe("Save");
    expect(get(english.t)("Save")).toBe("Zapisz");
  });
});

import { describe, expect, it } from "vitest";
import { render } from "svelte/server";
import Harness from "./CodeEditor.harness.svelte";

describe("administrative code editor SSR fallback", () => {
  it.each([
    ["pl", "Wczytywanie edytora…"],
    ["en", "Loading editor..."],
  ] as const)("localizes %s and safely displays source code", (initialLocale, loading) => {
    const result = render(Harness, {
      props: { initialLocale, initialValue: '<script>alert("test")</script><img src=x onerror=alert(1)>' },
    });
    expect(result.body).toContain(loading);
    expect(result.body).toContain("code-editor-fallback");
    expect(result.body).toContain("&lt;script>");
    expect(result.body).toContain("&lt;img");
    expect(result.body).not.toContain("<script>alert");
    expect(result.body).not.toContain("<img src=x");
  });
});

import { expect, it } from "vitest";

const routes = import.meta.glob<string>("./**/+server.ts", { query: "?raw", import: "default", eager: true });

it("v4 routes write through the controllers the dashboard uses, never through db directly", () => {
  const directWrites: Record<string, string[]> = {};
  for (const [file, source] of Object.entries(routes)) {
    const writes = [...source.matchAll(/\bdb\.(\w+)\(/g)].map((m) => m[1]).filter((name) => !name.startsWith("get"));
    if (writes.length > 0) directWrites[file] = [...new Set(writes)].sort();
  }
  expect(directWrites).toEqual({});
});

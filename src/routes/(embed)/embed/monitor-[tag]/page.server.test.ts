import { describe, expect, it } from "vitest";
import { load } from "./+page.server";

const run = (query: string) =>
  load({ params: { tag: "kener" }, url: new URL(`http://localhost/embed/monitor-kener${query}`) } as Parameters<
    typeof load
  >[0]);

describe("embed monitor load", () => {
  it.each([
    ["", 90],
    ["?days=abc", 90],
    ["?days=30", 30],
    ["?days=0", 1],
    ["?days=500", 90],
  ])("%s gives days=%i", async (query, days) => {
    expect(await run(query)).toMatchObject({ days });
  });
});

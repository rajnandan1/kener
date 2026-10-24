import { describe, expect, it } from "vitest";
import { load } from "./+page.server";

const run = (query: string) =>
  load({ params: { tag: "kener" }, url: new URL(`http://localhost/embed/latency-kener${query}`) } as Parameters<
    typeof load
  >[0]);

describe("embed latency load", () => {
  it.each([
    ["", 90, 128],
    ["?days=abc&height=abc", 90, 128],
    ["?days=7&height=300", 7, 300],
    ["?days=0&height=10", 1, 50],
  ])("%s gives days=%i and height=%i", async (query, days, height) => {
    expect(await run(query)).toMatchObject({ days, height });
  });
});

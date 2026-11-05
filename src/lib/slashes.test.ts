import { describe, expect, it } from "vitest";
import { TrimSlashes, TrimTrailingSlashes } from "./slashes";

describe("slash trimming", () => {
  it.each([
    ["https://status.example.com/", "https://status.example.com"],
    ["https://status.example.com///", "https://status.example.com"],
    ["/docs/v4/", "/docs/v4"],
    ["no-slash", "no-slash"],
    ["///", ""],
    ["", ""],
  ])("TrimTrailingSlashes(%j) is %j", (value, expected) => {
    expect(TrimTrailingSlashes(value)).toBe(expected);
  });

  it.each([
    ["/docs/v4/", "docs/v4"],
    ["//a//b//", "a//b"],
    ["a", "a"],
    ["//", ""],
  ])("TrimSlashes(%j) is %j", (value, expected) => {
    expect(TrimSlashes(value)).toBe(expected);
  });

  it("stays fast on a long run of slashes", () => {
    const long = "a" + "/".repeat(200_000) + "b";
    const started = performance.now();
    expect(TrimTrailingSlashes(long)).toBe(long);
    expect(TrimSlashes("/".repeat(200_000))).toBe("");
    expect(performance.now() - started).toBeLessThan(200);
  });
});

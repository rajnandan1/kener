import { afterEach, describe, expect, it, vi } from "vitest";
import serverResolve from "./resolver.js";

describe("serverResolve", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefixes KENER_BASE_PATH onto uploaded favicon asset paths", () => {
    vi.stubEnv("KENER_BASE_PATH", "/status");
    expect(serverResolve("/assets/images/abc123.png")).toBe("/status/assets/images/abc123.png");
  });

  it("prefixes KENER_BASE_PATH onto the default favicon path", () => {
    vi.stubEnv("KENER_BASE_PATH", "/status");
    expect(serverResolve("/logo96.png")).toBe("/status/logo96.png");
  });

  it("returns the path unchanged when KENER_BASE_PATH is unset", () => {
    vi.stubEnv("KENER_BASE_PATH", "");
    expect(serverResolve("/assets/images/abc123.png")).toBe("/assets/images/abc123.png");
  });

  it("leaves absolute URLs unchanged", () => {
    vi.stubEnv("KENER_BASE_PATH", "/status");
    expect(serverResolve("https://cdn.example.com/icon.png")).toBe("https://cdn.example.com/icon.png");
  });

  it("collapses a trailing slash on KENER_BASE_PATH", () => {
    vi.stubEnv("KENER_BASE_PATH", "/status/");
    expect(serverResolve("/assets/images/abc123.png")).toBe("/status/assets/images/abc123.png");
  });
});

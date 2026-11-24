import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteCache, getCache, setCache } from "./cache";

describe("cache without Redis", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("REDIS_URL", "");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("expires cached values after their TTL", async () => {
    await setCache("cache-test-expiry", { status: "UP" }, 2);
    expect(await getCache("cache-test-expiry")).toEqual({ status: "UP" });

    vi.advanceTimersByTime(2001);

    expect(await getCache("cache-test-expiry")).toBeNull();
  });

  it("uses the fetcher once while the cached value is fresh", async () => {
    const fetcher = vi.fn(async () => ({ value: 42 }));

    expect(await getCache("cache-test-fetcher", fetcher, 30)).toEqual({ value: 42 });
    expect(await getCache("cache-test-fetcher", fetcher, 30)).toEqual({ value: 42 });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("removes a cached value", async () => {
    await setCache("cache-test-delete", "cached", 30);
    await deleteCache("cache-test-delete");

    expect(await getCache("cache-test-delete")).toBeNull();
  });

  it("shares entries across separately loaded module instances", async () => {
    vi.resetModules();
    const first = await import("./cache");
    await first.setCache("cache-test-shared", { status: "UP" }, 30);

    vi.resetModules();
    const second = await import("./cache");

    expect(await second.getCache("cache-test-shared")).toEqual({ status: "UP" });
    await second.deleteCache("cache-test-shared");
  });
});

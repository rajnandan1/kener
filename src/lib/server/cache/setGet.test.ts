import { beforeEach, describe, expect, it, vi } from "vitest";

/** In-memory Redis that implements the last_status compare-and-set Lua semantics. */
const store = new Map<string, string>();

const evalFn = vi.fn(async (script: string, _numKeys: number, key: string, payload: string, ts: string, ttl: string) => {
  if (!script.includes("tonumber(existing['timestamp']) > tonumber(ARGV[2])")) {
    throw new Error("unexpected Lua script");
  }
  const raw = store.get(key);
  if (raw) {
    try {
      const existing = JSON.parse(raw) as { timestamp?: number };
      if (existing.timestamp != null && Number(existing.timestamp) > Number(ts)) {
        return 0;
      }
    } catch {
      // overwrite invalid
    }
  }
  store.set(key, payload);
  void ttl;
  return 1;
});

const get = vi.fn(async (key: string) => store.get(key) ?? null);
const set = vi.fn(async (key: string, payload: string) => {
  store.set(key, payload);
  return "OK";
});
const del = vi.fn(async (key: string) => {
  store.delete(key);
  return 1;
});
const mget = vi.fn();

vi.mock("../redisConnector.js", () => ({
  redisIOConnection: () => ({
    eval: evalFn,
    get,
    set,
    del,
    mget,
    pipeline: () => ({
      set: vi.fn().mockReturnThis(),
      exec: vi.fn(),
    }),
  }),
}));

import { GetLastMonitoringValue, SetLastMonitoringValue } from "./setGet.js";
import type { MonitoringData } from "../types/db.js";

const sample = (timestamp: number, status = "UP"): MonitoringData => ({
  monitor_tag: "api",
  timestamp,
  status,
  latency: 10,
  type: "REALTIME",
});

describe("SetLastMonitoringValue", () => {
  beforeEach(() => {
    store.clear();
    evalFn.mockClear();
    get.mockClear();
    set.mockClear();
  });

  it("keeps a newer cached sample when an older check finishes later", async () => {
    await SetLastMonitoringValue("api", sample(200, "UP"));
    await SetLastMonitoringValue("api", sample(100, "DOWN"));

    const retained = JSON.parse(store.get("kener:cache:api:last_status")!);
    expect(retained.timestamp).toBe(200);
    expect(retained.status).toBe("UP");
  });

  it("force replaces a newer cached sample (admin delete/update refresh)", async () => {
    await SetLastMonitoringValue("api", sample(200, "UP"));
    await SetLastMonitoringValue("api", sample(100, "DOWN"), { force: true });

    const retained = JSON.parse(store.get("kener:cache:api:last_status")!);
    expect(retained.timestamp).toBe(100);
    expect(retained.status).toBe("DOWN");
    expect(set).toHaveBeenCalled();
  });
});

describe("GetLastMonitoringValue fetcher seed", () => {
  beforeEach(() => {
    store.clear();
    evalFn.mockClear();
    get.mockClear();
  });

  it("returns the Redis-retained sample when a newer write wins over the fetcher", async () => {
    const result = await GetLastMonitoringValue("api", async () => {
      // Concurrent newer check lands while the DB fetcher is in flight.
      await SetLastMonitoringValue("api", sample(300, "UP"));
      return sample(100, "DOWN");
    });

    expect(result?.timestamp).toBe(300);
    expect(result?.status).toBe("UP");
  });
});

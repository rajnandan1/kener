import { beforeEach, describe, expect, it, vi } from "vitest";

/** In-memory Redis that implements the last_status ordered Lua semantics. */
const store = new Map<string, string>();

const evalFn = vi.fn(
  async (
    script: string,
    _numKeys: number,
    key: string,
    payload: string,
    ts: string,
    ttl: string,
    expected = "",
  ) => {
    if (!script.includes("cur > new_ts")) {
      throw new Error("unexpected Lua script");
    }
    const raw = store.get(key);
    const newTs = Number(ts);
    if (raw) {
      try {
        const existing = JSON.parse(raw) as { timestamp?: number };
        if (existing.timestamp != null) {
          const cur = Number(existing.timestamp);
          if (cur > newTs) {
            if (expected === "" || cur !== Number(expected)) {
              return 0;
            }
          }
        }
      } catch {
        // overwrite invalid
      }
    }
    store.set(key, payload);
    void ttl;
    return 1;
  },
);

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

  it("replaceCachedTimestamp swaps a deleted newer sample for the remaining DB row", async () => {
    await SetLastMonitoringValue("api", sample(200, "UP"));
    await SetLastMonitoringValue("api", sample(100, "DOWN"), { replaceCachedTimestamp: 200 });

    const retained = JSON.parse(store.get("kener:cache:api:last_status")!);
    expect(retained.timestamp).toBe(100);
    expect(retained.status).toBe("DOWN");
  });

  it("replaceCachedTimestamp does not overwrite a concurrent newer check", async () => {
    await SetLastMonitoringValue("api", sample(200, "UP"));
    // Concurrent check lands while admin refresh still holds expected=200
    await SetLastMonitoringValue("api", sample(300, "DEGRADED"));
    await SetLastMonitoringValue("api", sample(100, "DOWN"), { replaceCachedTimestamp: 200 });

    const retained = JSON.parse(store.get("kener:cache:api:last_status")!);
    expect(retained.timestamp).toBe(300);
    expect(retained.status).toBe("DEGRADED");
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
      await SetLastMonitoringValue("api", sample(300, "UP"));
      return sample(100, "DOWN");
    });

    expect(result?.timestamp).toBe(300);
    expect(result?.status).toBe("UP");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const evalFn = vi.fn();
const get = vi.fn();
const set = vi.fn();
const del = vi.fn();
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

import { SetLastMonitoringValue } from "./setGet.js";
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
    evalFn.mockReset();
    evalFn.mockResolvedValue(1);
  });

  it("writes via a Lua compare-and-set keyed by sample timestamp", async () => {
    const value = sample(1_700_000_100);
    await SetLastMonitoringValue("api", value);

    expect(evalFn).toHaveBeenCalledOnce();
    const [script, numKeys, key, payload, ts, ttl] = evalFn.mock.calls[0];
    expect(script).toContain("tonumber(existing['timestamp']) > tonumber(ARGV[2])");
    expect(numKeys).toBe(1);
    expect(key).toBe("kener:cache:api:last_status");
    expect(payload).toBe(JSON.stringify(value));
    expect(ts).toBe("1700000100");
    expect(ttl).toBe("86400");
  });
});

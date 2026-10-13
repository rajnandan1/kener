import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$lib/server/db/db", () => ({
  default: {
    insertMonitor: vi.fn().mockResolvedValue([1]),
    updateMonitor: vi.fn().mockResolvedValue(1),
    getMonitorsByTag: vi.fn(),
    getMonitors: vi.fn().mockResolvedValue([]),
  },
}));

import db from "$lib/server/db/db";
import {
  CloneMonitor,
  CreateMonitor,
  CreateUpdateMonitor,
  combineCachedAndDbLatest,
  mergeLatestMonitoringWithSslCache,
  mergeStatusCountsByMonitor,
  statusCountsCacheKey,
  statusCountsHistoryCacheKey,
  statusCountsTodayStart,
} from "./monitorsController.js";
import { HEARTBEAT_SECRET_RULE } from "$lib/anywhere";
import type { MonitoringData, TimestampStatusCountByMonitor } from "../types/db.js";

const mockedDb = vi.mocked(db);

const apiMonitor = (typeData: Record<string, unknown>, id?: number) => ({
  id,
  tag: "api-proxy",
  name: "API proxy",
  monitor_type: "API",
  type_data: JSON.stringify({ url: "https://example.com", method: "GET", ...typeData }),
});

beforeEach(() => {
  mockedDb.insertMonitor.mockClear();
  mockedDb.updateMonitor.mockClear();
});

describe("monitor save: type_data.proxy scheme check", () => {
  // Node silently ignores a proxy URL that is not http(s)://, so a typo would run the check
  // unproxied and look UP. Save is the only place a typo can be caught.
  const rejection = "Proxy URL must be a valid http:// or https:// URL";

  it("rejects a non-http(s) proxy on create", async () => {
    await expect(CreateUpdateMonitor(apiMonitor({ proxy: "socks5://proxy:1080" }))).rejects.toThrow(rejection);
    await expect(CreateMonitor(apiMonitor({ proxy: "proxy.internal:3128" }))).rejects.toThrow(rejection);
    // Node's proxyEnv parser only recognises lowercase schemes; "HTTP://" would save and run direct.
    await expect(CreateMonitor(apiMonitor({ proxy: "HTTPS://proxy.internal:3128" }))).rejects.toThrow(rejection);
    expect(mockedDb.insertMonitor).not.toHaveBeenCalled();
  });

  it("rejects it on update too", async () => {
    await expect(CreateUpdateMonitor(apiMonitor({ proxy: "ftp://proxy" }, 7))).rejects.toThrow(rejection);
    expect(mockedDb.updateMonitor).not.toHaveBeenCalled();
  });

  it("accepts http(s) proxies, including $SECRET credentials, and no proxy at all", async () => {
    await CreateUpdateMonitor(apiMonitor({ proxy: "http://user:$PROXY_PASS@proxy.internal:3128" }));
    await CreateUpdateMonitor(apiMonitor({ proxy: "https://proxy.internal:3128" }));
    await CreateUpdateMonitor(apiMonitor({ proxy: "" }));
    await CreateUpdateMonitor(apiMonitor({}));
    expect(mockedDb.insertMonitor).toHaveBeenCalledTimes(4);
  });

  it("rejects a malformed authority the URL parser cannot take", async () => {
    // Node throws ERR_PROXY_INVALID_CONFIG on these while building the agents, which would
    // fail the check itself rather than the save.
    for (const proxy of ["http://proxy:abc", "http://:3128", "http://proxy:99999", "http://[::1"]) {
      await expect(CreateMonitor(apiMonitor({ proxy }))).rejects.toThrow(rejection);
    }
    expect(mockedDb.insertMonitor).not.toHaveBeenCalled();
  });

  it("rejects a proxy that is not a string at all", async () => {
    // type_data is parsed JSON: the API can hand us any shape here.
    for (const proxy of [{}, 3128, true, ["http://proxy:3128"]]) {
      await expect(CreateMonitor(apiMonitor({ proxy }))).rejects.toThrow(rejection);
    }
    expect(mockedDb.insertMonitor).not.toHaveBeenCalled();
  });

  it("leaves monitors without parseable type_data alone", async () => {
    await CreateUpdateMonitor({ tag: "none", name: "None", monitor_type: "NONE", type_data: null });
    await CreateUpdateMonitor({ tag: "bad", name: "Bad", monitor_type: "API", type_data: "{not json" });
    expect(mockedDb.insertMonitor).toHaveBeenCalledTimes(2);
  });
});

const heartbeatMonitor = (typeData: Record<string, unknown> | null, id?: number) => ({
  id,
  tag: "hb",
  name: "Heartbeat",
  monitor_type: "HEARTBEAT",
  type_data: typeData && JSON.stringify({ degradedRemainingMinutes: 5, downRemainingMinutes: 10, ...typeData }),
});

describe("monitor save: heartbeat secret", () => {
  const rejection = `Heartbeat secret breaks the rule. ${HEARTBEAT_SECRET_RULE}`;

  it("rejects a secret with a character outside the URL-safe set", async () => {
    await expect(CreateUpdateMonitor(heartbeatMonitor({ secretString: "alertmanager/hb-01" }))).rejects.toThrow(
      rejection,
    );
    await expect(CreateUpdateMonitor(heartbeatMonitor({ secretString: "a/b?c" }, 7))).rejects.toThrow(rejection);
    expect(mockedDb.insertMonitor).not.toHaveBeenCalled();
    expect(mockedDb.updateMonitor).not.toHaveBeenCalled();
  });

  it("rejects an 11-character secret and keeps a 12-character one as given", async () => {
    await expect(CreateUpdateMonitor(heartbeatMonitor({ secretString: "abcdefghijk" }))).rejects.toThrow(rejection);
    await CreateUpdateMonitor(heartbeatMonitor({ secretString: "abc.def_g~-1" }));
    expect(mockedDb.insertMonitor).toHaveBeenCalledOnce();
    expect(JSON.parse(mockedDb.insertMonitor.mock.calls[0][0].type_data!).secretString).toBe("abc.def_g~-1");
  });

  it("generates a secret when the save has none, and keeps the rest of type_data", async () => {
    await CreateUpdateMonitor(heartbeatMonitor({}));
    await CreateUpdateMonitor(heartbeatMonitor(null));
    await CreateUpdateMonitor(heartbeatMonitor({}, 7));

    const saved = [...mockedDb.insertMonitor.mock.calls, ...mockedDb.updateMonitor.mock.calls].map(([m]) =>
      JSON.parse(m.type_data!),
    );
    expect(saved).toHaveLength(3);
    for (const typeData of saved) {
      expect(typeData.secretString).toMatch(/^[a-z]+-[a-z]+-[a-z]+-[a-z]+$/);
    }
    expect(saved[0]).toMatchObject({ degradedRemainingMinutes: 5, downRemainingMinutes: 10 });
  });

  it("keeps a stored secret the rule would reject when an admin save leaves it unchanged", async () => {
    mockedDb.getMonitors.mockResolvedValueOnce([heartbeatMonitor({ secretString: "ab" }, 7)] as never);

    await CreateUpdateMonitor({ ...heartbeatMonitor({ secretString: "ab" }, 7), name: "Renamed" });

    expect(mockedDb.updateMonitor).toHaveBeenCalledOnce();
    expect(mockedDb.updateMonitor.mock.calls[0][0]).toMatchObject({ name: "Renamed" });
    expect(JSON.parse(mockedDb.updateMonitor.mock.calls[0][0].type_data!).secretString).toBe("ab");
  });

  it("keeps the stored type_data when an admin save sends none, as the status switch does", async () => {
    const storedMonitor = heartbeatMonitor({ secretString: "my-alertmanager-hb-01" }, 7);
    mockedDb.getMonitors.mockResolvedValueOnce([storedMonitor] as never);

    await CreateUpdateMonitor({ ...storedMonitor, type_data: undefined, status: "INACTIVE" });

    expect(mockedDb.updateMonitor.mock.calls[0][0]).toMatchObject({
      status: "INACTIVE",
      type_data: storedMonitor.type_data,
    });
  });

  it("rejects a changed secret that breaks the rule on update", async () => {
    mockedDb.getMonitors.mockResolvedValueOnce([
      heartbeatMonitor({ secretString: "my-alertmanager-hb-01" }, 7),
    ] as never);

    await expect(CreateUpdateMonitor(heartbeatMonitor({ secretString: "ab" }, 7))).rejects.toThrow(rejection);
    expect(mockedDb.updateMonitor).not.toHaveBeenCalled();
  });

  it("gives a clone of a heartbeat monitor a new secret", async () => {
    const source = { ...heartbeatMonitor({ secretString: "my-alertmanager-hb-01" }, 7), status: "ACTIVE" };
    mockedDb.getMonitorsByTag.mockImplementation(async (tag: string) => (tag === "hb" ? source : undefined) as never);

    await CloneMonitor({ sourceTag: "hb", newTag: "hb-copy", newName: "Heartbeat copy" });

    const cloned = JSON.parse(mockedDb.insertMonitor.mock.calls[0][0].type_data!);
    expect(cloned.secretString).toMatch(/^[a-z]+-[a-z]+-[a-z]+-[a-z]+$/);
    expect(cloned).toMatchObject({ degradedRemainingMinutes: 5, downRemainingMinutes: 10 });
  });
});

const row = (tag: string, status: string): MonitoringData => ({
  monitor_tag: tag,
  timestamp: 1,
  status,
  latency: 10,
  type: "REALTIME",
});

const day = (tag: string, ts: number): TimestampStatusCountByMonitor => ({
  monitor_tag: tag,
  ts,
  countOfUp: 1,
  countOfDown: 0,
  countOfDegraded: 0,
  countOfMaintenance: 0,
  avgLatency: 10,
  maxLatency: 10,
  minLatency: 10,
});

describe("combineCachedAndDbLatest", () => {
  it("prefers cache hits and fills misses from DB in tag order", () => {
    const cached = [row("a", "UP"), null, row("c", "DOWN")];
    const fromDb = [row("b", "DEGRADED")];
    expect(combineCachedAndDbLatest(["a", "b", "c"], cached, fromDb)).toEqual([
      row("a", "UP"),
      row("b", "DEGRADED"),
      row("c", "DOWN"),
    ]);
  });

  it("omits tags that are missing from both cache and DB", () => {
    expect(combineCachedAndDbLatest(["a", "b"], [null, null], [row("a", "UP")])).toEqual([row("a", "UP")]);
  });
});

describe("mergeLatestMonitoringWithSslCache", () => {
  it("attaches Redis SSL fields when timestamps match", () => {
    const fromDb = { ...row("ssl", "UP"), timestamp: 100, latency: 0 };
    const cached = {
      ...row("ssl", "UP"),
      timestamp: 100,
      latency: 0,
      expiry_at: "2020-01-01T00:00:00.000Z",
      issuer_cn: "R3",
      issuer_o: "Let's Encrypt",
    };
    expect(mergeLatestMonitoringWithSslCache(fromDb, cached)).toEqual({
      ...fromDb,
      expiry_at: "2020-01-01T00:00:00.000Z",
      issuer_cn: "R3",
      issuer_o: "Let's Encrypt",
    });
  });

  it("ignores stale cache when DB has a newer check", () => {
    const fromDb = { ...row("ssl", "DOWN"), timestamp: 200, latency: 0 };
    const cached = {
      ...row("ssl", "UP"),
      timestamp: 100,
      expiry_at: "2030-01-01T00:00:00.000Z",
      issuer_cn: "stale",
    };
    expect(mergeLatestMonitoringWithSslCache(fromDb, cached)).toEqual(fromDb);
  });

  it("does not keep SSL metadata when status/type changed at the same timestamp", () => {
    const fromDb = { ...row("ssl", "DOWN"), timestamp: 100, type: "MANUAL", latency: 0 };
    const cached = {
      ...row("ssl", "UP"),
      timestamp: 100,
      type: "REALTIME",
      expiry_at: "2030-01-01T00:00:00.000Z",
      issuer_cn: "R3",
    };
    expect(mergeLatestMonitoringWithSslCache(fromDb, cached)).toEqual(fromDb);
  });

  it("falls back to cache when DB has no row", () => {
    const cached = { ...row("ssl", "UP"), expiry_at: "2030-01-01T00:00:00.000Z" };
    expect(mergeLatestMonitoringWithSslCache(null, cached)).toEqual(cached);
  });
});

describe("statusCountsCacheKey", () => {
  it("is per-tag so pages can share monitor aggregates", () => {
    expect(statusCountsCacheKey("a", 1, 86400, 89)).toBe("status_counts:a:1:86400:89");
    expect(statusCountsCacheKey("a", 1, 86400, 89)).not.toBe(statusCountsCacheKey("b", 1, 86400, 89));
  });
});

describe("statusCountsHistoryCacheKey", () => {
  it("keys completed-day history by todayStart so the query origin and Redis identity match", () => {
    const todayStart = 1_700_000_000 + 89 * 86400;
    expect(statusCountsHistoryCacheKey("a", todayStart, 89)).toBe(`status_counts:a:until:${todayStart}:89`);
    expect(statusCountsHistoryCacheKey("a", todayStart, 89)).not.toBe(
      statusCountsHistoryCacheKey("b", todayStart, 89),
    );
  });
});

describe("statusCountsTodayStart", () => {
  it("returns the last daily bucket start for a multi-day window", () => {
    const start = 1_700_000_000;
    expect(statusCountsTodayStart(start, 86400, 90)).toBe(start + 89 * 86400);
  });

  it("returns null for today-only or non-daily windows so those stay uncached", () => {
    expect(statusCountsTodayStart(1, 86400, 1)).toBeNull();
    expect(statusCountsTodayStart(1, 3600, 24)).toBeNull();
  });
});

describe("mergeStatusCountsByMonitor", () => {
  it("uses cache hits and fills misses from DB in request tag order", () => {
    const cached: Array<TimestampStatusCountByMonitor[] | null> = [[day("a", 10)], null, [day("c", 30)]];
    const fromDb = [day("b", 20), day("b", 21)];
    expect(mergeStatusCountsByMonitor(["a", "b", "c"], cached, fromDb)).toEqual([
      day("a", 10),
      day("b", 20),
      day("b", 21),
      day("c", 30),
    ]);
  });

  it("treats empty DB results as an empty series for a missing tag", () => {
    expect(mergeStatusCountsByMonitor(["a"], [null], [])).toEqual([]);
  });
});

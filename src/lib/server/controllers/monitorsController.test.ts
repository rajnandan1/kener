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
  MaskMonitorSecrets,
  mergeLatestMonitoringWithSslCache,
  RestoreMonitorSecrets,
} from "./monitorsController";
import { HEARTBEAT_SECRET_RULE } from "$lib/anywhere";
import type { MonitoringData } from "../types/db.js";

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

  it("keeps a stored proxy it would reject when an update sends it masked or sends no type_data", async () => {
    const storedMonitor = apiMonitor({ proxy: "socks5://user:pass@proxy:1080" }, 7);
    mockedDb.getMonitors.mockResolvedValue([storedMonitor] as never);

    await CreateUpdateMonitor({ ...storedMonitor, type_data: undefined, status: "INACTIVE" });
    await CreateUpdateMonitor(apiMonitor({ proxy: "********" }, 7));

    mockedDb.getMonitors.mockResolvedValue([]);
    const saved = mockedDb.updateMonitor.mock.calls.map(([monitor]) => JSON.parse(monitor.type_data!).proxy);
    expect(saved).toEqual(["socks5://user:pass@proxy:1080", "socks5://user:pass@proxy:1080"]);
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

describe("mergeLatestMonitoringWithSslCache", () => {
  const dbRow: MonitoringData = { monitor_tag: "ssl", timestamp: 100, status: "UP", latency: 42, type: "REALTIME" };
  const sslFields = {
    expiry_at: "2030-01-01T00:00:00.000Z",
    issuer_cn: "R3",
    issuer_o: "Let's Encrypt",
    cert_trusted: false,
  };

  it("attaches Redis SSL fields when the cache holds the same check", () => {
    expect(mergeLatestMonitoringWithSslCache(dbRow, { ...dbRow, ...sslFields })).toEqual({ ...dbRow, ...sslFields });
  });

  it("ignores a cache entry from another check", () => {
    expect(mergeLatestMonitoringWithSslCache(dbRow, { ...dbRow, ...sslFields, timestamp: 40 })).toEqual(dbRow);
    expect(mergeLatestMonitoringWithSslCache(dbRow, { ...dbRow, ...sslFields, status: "DOWN" })).toEqual(dbRow);
    expect(mergeLatestMonitoringWithSslCache(dbRow, { ...dbRow, ...sslFields, type: "MANUAL" })).toEqual(dbRow);
  });

  it("returns null when the DB has no row, even if Redis still has one", () => {
    expect(mergeLatestMonitoringWithSslCache(null, { ...dbRow, ...sslFields })).toBeNull();
  });
});

describe("monitor type_data secrets", () => {
  const secrets = {
    url: "https://example.com/health",
    method: "POST",
    headers: [
      { key: "Authorization", value: "Bearer sk-prod-abc123secret" },
      { key: "Accept", value: "*/*" },
    ],
    body: '{"password":"hunter22"}',
    proxy: "http://user:pass@proxy.internal:3128",
    connectionString: "postgresql://monitor:pw@db.example.com:5432/app",
    secretString: "my-job-hb-secret-01",
    tlsKey: "-----BEGIN PRIVATE KEY-----\nMIIE\n-----END PRIVATE KEY-----\n",
    timeout: 5000,
  };
  const masked = {
    ...secrets,
    headers: [
      { key: "Authorization", value: "********" },
      { key: "Accept", value: "********" },
    ],
    body: "********",
    proxy: "********",
    connectionString: "********",
    secretString: "********",
    tlsKey: "********",
  };
  const monitor = { id: 1, tag: "api", monitor_type: "API", type_data: secrets };

  it("masks every secret field and header value, and nothing else", () => {
    expect(MaskMonitorSecrets(monitor as never)).toEqual({ ...monitor, type_data: masked });
    expect(monitor.type_data).toBe(secrets);
  });

  it("leaves empty, missing, and non-string values alone", () => {
    const typeData = { proxy: { host: "x" }, body: "", headers: [{ key: "X" }, "junk"], secretString: null };

    expect(MaskMonitorSecrets({ ...monitor, type_data: typeData } as never).type_data).toEqual(typeData);
    expect(MaskMonitorSecrets({ ...monitor, type_data: null } as never).type_data).toBeNull();
  });

  it("puts every stored secret back when the masked type_data comes back", () => {
    expect(RestoreMonitorSecrets(masked, secrets)).toEqual(secrets);
  });

  it("finds a masked header by key when the headers moved", () => {
    const headers = [{ key: "X-New", value: "plain" }, ...masked.headers.slice().reverse()];

    expect(RestoreMonitorSecrets({ headers }, secrets).headers).toEqual([
      { key: "X-New", value: "plain" },
      ...secrets.headers.slice().reverse(),
    ]);
  });

  it("finds a masked header whose name changed only in case", () => {
    const headers = [{ key: "authorization", value: "********" }];

    expect(RestoreMonitorSecrets({ headers }, secrets).headers).toEqual([
      { key: "authorization", value: "Bearer sk-prod-abc123secret" },
    ]);
  });

  it("prefers the header with the exact name when saved names differ only in case", () => {
    const stored = {
      headers: [
        { key: "authorization", value: "token-A" },
        { key: "Authorization", value: "token-B" },
      ],
    };

    expect(RestoreMonitorSecrets({ headers: [{ key: "Authorization", value: "********" }] }, stored).headers).toEqual([
      { key: "Authorization", value: "token-B" },
    ]);
  });

  it("restores repeated header names in order after a header is added in front", () => {
    const stored = {
      headers: [
        { key: "X-Token", value: "first" },
        { key: "X-Token", value: "second" },
      ],
    };
    const headers = [
      { key: "X-New", value: "plain" },
      { key: "X-Token", value: "********" },
      { key: "X-Token", value: "********" },
    ];

    expect(RestoreMonitorSecrets({ headers }, stored).headers).toEqual([
      { key: "X-New", value: "plain" },
      { key: "X-Token", value: "first" },
      { key: "X-Token", value: "second" },
    ]);
  });

  it("uses each stored header value at most once when names repeat in mixed case", () => {
    const restored = (stored: [string, string][], sent: string[]) =>
      RestoreMonitorSecrets(
        { headers: sent.map((key) => ({ key, value: "********" })) },
        { headers: stored.map(([key, value]) => ({ key, value })) },
      ).headers as { key: string; value: string }[];

    const renamed = restored(
      [
        ["Authorization", "token-A"],
        ["Authorization", "token-B"],
      ],
      ["authorization", "Authorization"],
    );
    expect(renamed.map((h) => h.value).sort()).toEqual(["token-A", "token-B"]);

    expect(
      restored(
        [
          ["Authorization", "B"],
          ["authorization", "A"],
        ],
        ["AUTHORIZATION", "Authorization"],
      ),
    ).toEqual([
      { key: "AUTHORIZATION", value: "A" },
      { key: "Authorization", value: "B" },
    ]);
  });

  it("pairs rows in order, so an added same-name row and an edited first row both keep the stored values", () => {
    const appended = RestoreMonitorSecrets(
      {
        headers: [
          { key: "X-Auth", value: "********" },
          { key: "X-Auth", value: "new" },
        ],
      },
      { headers: [{ key: "X-Auth", value: "A" }] },
    );
    expect(appended.headers).toEqual([
      { key: "X-Auth", value: "A" },
      { key: "X-Auth", value: "new" },
    ]);

    const editedFirst = RestoreMonitorSecrets(
      {
        headers: [
          { key: "X-Auth", value: "new" },
          { key: "X-Auth", value: "********" },
        ],
      },
      {
        headers: [
          { key: "X-Auth", value: "A" },
          { key: "X-Auth", value: "B" },
        ],
      },
    );
    expect(editedFirst.headers).toEqual([
      { key: "X-Auth", value: "new" },
      { key: "X-Auth", value: "B" },
    ]);
  });

  it("keeps a real value that only looks masked", () => {
    const stored = { headers: [{ key: "Accept", value: "application/json" }], body: "old" };

    expect(RestoreMonitorSecrets({ headers: [{ key: "Accept", value: "*/*" }], body: "**" }, stored)).toEqual({
      headers: [{ key: "Accept", value: "*/*" }],
      body: "**",
    });
  });

  it("keeps new values and saves an empty string for a mask with no stored secret", () => {
    const typeData = {
      secretString: "new-hb-secret-0001",
      body: "********",
      headers: [{ key: "X-Key", value: "********" }],
    };

    expect(RestoreMonitorSecrets(typeData, { headers: secrets.headers })).toEqual({
      secretString: "new-hb-secret-0001",
      body: "",
      headers: [{ key: "X-Key", value: "" }],
    });
  });
});

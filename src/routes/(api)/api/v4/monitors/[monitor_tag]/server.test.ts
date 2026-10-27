import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, rows } = vi.hoisted(() => {
  const rows = new Map<string, Record<string, unknown>>();
  return {
    rows,
    db: {
      updateMonitor: vi.fn(async (monitor: Record<string, unknown>) => {
        rows.set(monitor.tag as string, monitor);
        return 1;
      }),
      getMonitors: vi.fn(async ({ tag }: { tag: string }) => (rows.has(tag) ? [rows.get(tag)] : [])),
    },
  };
});
vi.mock("$lib/server/db/db", () => ({ default: db }));

import { GET, PATCH } from "./+server";
import { HEARTBEAT_SECRET_RULE } from "$lib/anywhere";

const stored = (monitor_type: string, type_data: Record<string, unknown>) => ({
  id: 7,
  tag: "hb",
  name: "HB",
  monitor_type,
  type_data,
  monitor_settings_json: {},
});

const patch = (monitor: ReturnType<typeof stored>, body: Record<string, unknown>) =>
  PATCH({
    locals: { monitor },
    request: new Request("http://localhost/api/v4/monitors/hb", { method: "PATCH", body: JSON.stringify(body) }),
  } as Parameters<typeof PATCH>[0]);

const saved = () => JSON.parse(rows.get("hb")!.type_data as string);

beforeEach(() => {
  rows.clear();
  db.updateMonitor.mockClear();
});

describe("PATCH /api/v4/monitors/{tag}", () => {
  it("returns 400 when the body sets a heartbeat secret that breaks the rule", async () => {
    const response = await patch(stored("HEARTBEAT", { secretString: "abc.def_g~-1" }), {
      type_data: { secretString: "a/b?c" },
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "BAD_REQUEST", message: `Heartbeat secret breaks the rule. ${HEARTBEAT_SECRET_RULE}` },
    });
    expect(db.updateMonitor).not.toHaveBeenCalled();
  });

  it("saves a generated secret when the monitor type changes to heartbeat", async () => {
    const response = await patch(stored("API", { url: "https://example.com" }), { monitor_type: "HEARTBEAT" });

    expect(response.status).toBe(200);
    expect(saved().secretString).toMatch(/^[a-z]+-[a-z]+-[a-z]+-[a-z]+$/);
  });

  it("keeps a stored secret the body does not touch, even one the rule would now reject", async () => {
    const response = await patch(stored("HEARTBEAT", { secretString: "ab" }), { name: "Renamed" });

    expect(response.status).toBe(200);
    expect(saved()).toEqual({ secretString: "ab" });
  });

  it("keeps a stored secret the rule would reject when the body sends it back unchanged", async () => {
    const monitor = stored("HEARTBEAT", { secretString: "ab", downRemainingMinutes: 10 });
    const response = await patch(monitor, { name: "Renamed", type_data: { ...monitor.type_data } });

    expect(response.status).toBe(200);
    expect(saved()).toEqual(monitor.type_data);
  });

  it("returns 400 when the body changes the stored secret to one that breaks the rule", async () => {
    const response = await patch(stored("HEARTBEAT", { secretString: "my-alertmanager-hb-01" }), {
      type_data: { secretString: "ab" },
    });

    expect(response.status).toBe(400);
    expect(db.updateMonitor).not.toHaveBeenCalled();
  });

  it("returns 400 when the body sets a proxy that is not an http(s) URL", async () => {
    const response = await patch(stored("API", { url: "https://example.com" }), {
      type_data: { proxy: "proxy.internal:3128" },
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "BAD_REQUEST", message: "Proxy URL must be a valid http:// or https:// URL" },
    });
    expect(db.updateMonitor).not.toHaveBeenCalled();
  });

  it("keeps a stored proxy the body does not change, even one the check would reject", async () => {
    const monitor = stored("API", { url: "https://example.com", proxy: "socks5://proxy.internal:1080" });

    expect((await patch(monitor, { name: "Renamed" })).status).toBe(200);
    const response = await patch(monitor, { name: "Renamed", type_data: { ...monitor.type_data } });
    expect(response.status).toBe(200);
    expect(saved().proxy).toBe("socks5://proxy.internal:1080");
  });

  it("keeps a stored object or array proxy the body does not change", async () => {
    for (const proxy of [{}, ["http://proxy.internal:3128"]]) {
      const monitor = stored("API", { url: "https://example.com", proxy });

      for (const body of [{ name: "Renamed" }, { name: "Renamed", type_data: { ...monitor.type_data } }]) {
        const response = await patch(monitor, body);
        expect(response.status).toBe(200);
        expect((await response.json()).monitor.type_data.proxy).toEqual(proxy);
      }
    }
  });

  it("masks type_data secrets in the response and keeps them when the masked value comes back", async () => {
    const monitor = stored("API", {
      url: "https://example.com",
      headers: [{ key: "Authorization", value: "Bearer sk-prod-abc123secret" }],
      proxy: "http://user:pass@proxy.internal:3128",
    });

    const first = (await (await patch(monitor, { name: "Renamed" })).json()).monitor;
    expect(first.type_data).toEqual({
      url: "https://example.com",
      headers: [{ key: "Authorization", value: "********" }],
      proxy: "********",
    });

    const response = await patch(monitor, { type_data: { ...first.type_data, url: "https://example.org" } });
    expect(response.status).toBe(200);
    expect(saved()).toEqual({ ...monitor.type_data, url: "https://example.org" });
  });

  it("keeps a stored heartbeat secret when the masked value comes back", async () => {
    const monitor = stored("HEARTBEAT", { secretString: "my-alertmanager-hb-01" });

    const response = await patch(monitor, { type_data: { secretString: "********" } });
    expect(response.status).toBe(200);
    expect(saved()).toEqual({ secretString: "my-alertmanager-hb-01" });
  });
});

describe("GET /api/v4/monitors/{tag}", () => {
  it("masks type_data secrets", async () => {
    const monitor = stored("SQL", {
      dbType: "pg",
      connectionString: "postgresql://u:pw@db:5432/app",
      query: "SELECT 1",
    });

    const response = await GET({ locals: { monitor } } as unknown as Parameters<typeof GET>[0]);
    expect((await response.json()).monitor.type_data).toEqual({
      ...monitor.type_data,
      connectionString: "********",
    });
  });
});

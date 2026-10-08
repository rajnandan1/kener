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

import { PATCH } from "./+server";
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

  it("returns a generated secret when the monitor type changes to heartbeat", async () => {
    const response = await patch(stored("API", { url: "https://example.com" }), { monitor_type: "HEARTBEAT" });

    expect(response.status).toBe(200);
    expect((await response.json()).monitor.type_data.secretString).toMatch(/^[a-z]+-[a-z]+-[a-z]+-[a-z]+$/);
  });

  it("keeps a stored secret the body does not touch, even one the rule would now reject", async () => {
    const response = await patch(stored("HEARTBEAT", { secretString: "ab" }), { name: "Renamed" });

    expect(response.status).toBe(200);
    expect((await response.json()).monitor).toMatchObject({ name: "Renamed", type_data: { secretString: "ab" } });
  });

  it("keeps a stored secret the rule would reject when the body sends it back unchanged", async () => {
    const monitor = stored("HEARTBEAT", { secretString: "ab", downRemainingMinutes: 10 });
    const response = await patch(monitor, { name: "Renamed", type_data: { ...monitor.type_data } });

    expect(response.status).toBe(200);
    expect((await response.json()).monitor).toMatchObject({ name: "Renamed", type_data: { secretString: "ab" } });
  });

  it("returns 400 when the body changes the stored secret to one that breaks the rule", async () => {
    const response = await patch(stored("HEARTBEAT", { secretString: "my-alertmanager-hb-01" }), {
      type_data: { secretString: "ab" },
    });

    expect(response.status).toBe(400);
    expect(db.updateMonitor).not.toHaveBeenCalled();
  });
});

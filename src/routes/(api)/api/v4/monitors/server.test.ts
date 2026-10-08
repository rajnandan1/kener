import { describe, expect, it, vi } from "vitest";

const { db } = vi.hoisted(() => {
  const rows = new Map<string, Record<string, unknown>>();
  return {
    db: {
      getMonitorByTag: vi.fn(async (tag: string) => rows.get(tag)),
      insertMonitor: vi.fn(async (monitor: Record<string, unknown>) => {
        rows.set(monitor.tag as string, monitor);
        return [rows.size];
      }),
      getMonitors: vi.fn(async ({ tag }: { tag: string }) => (rows.has(tag) ? [rows.get(tag)] : [])),
    },
  };
});
vi.mock("$lib/server/db/db", () => ({ default: db }));

import { POST } from "./+server";
import { HEARTBEAT_SECRET_RULE } from "$lib/anywhere";

const post = (body: Record<string, unknown>) =>
  POST({
    request: new Request("http://localhost/api/v4/monitors", { method: "POST", body: JSON.stringify(body) }),
  } as Parameters<typeof POST>[0]);

describe("POST /api/v4/monitors", () => {
  it("returns 400 for a heartbeat secret that breaks the rule", async () => {
    for (const secretString of ["a/b?c", "ab"]) {
      const response = await post({ tag: "hb", name: "HB", monitor_type: "HEARTBEAT", type_data: { secretString } });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: { code: "BAD_REQUEST", message: `Heartbeat secret breaks the rule. ${HEARTBEAT_SECRET_RULE}` },
      });
    }
    expect(db.insertMonitor).not.toHaveBeenCalled();
  });

  it("returns a generated secret for a heartbeat monitor sent without one", async () => {
    const response = await post({ tag: "hb", name: "HB", monitor_type: "HEARTBEAT" });

    expect(response.status).toBe(201);
    expect((await response.json()).monitor.type_data.secretString).toMatch(/^[a-z]+-[a-z]+-[a-z]+-[a-z]+$/);
  });
});

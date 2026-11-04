import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, subscriberQueue, lastStatus } = vi.hoisted(() => ({
  db: { getMonitorByTag: vi.fn() },
  subscriberQueue: { push: vi.fn() },
  lastStatus: new Map<string, { status: string; ts: number }>(),
}));
vi.mock("../db/db.js", () => ({ default: db }));
vi.mock("../queues/subscriberQueue.js", () => ({ default: subscriberQueue }));
vi.mock("../cache/setGet.js", () => ({
  GetLastSubscriberStatus: async (tag: string) => lastStatus.get(tag) ?? null,
  SetLastSubscriberStatus: async (tag: string, value: { status: string; ts: number }) => {
    lastStatus.set(tag, value);
  },
}));
vi.mock("./siteDataController.js", () => ({
  GetAllSiteData: vi.fn(async () => ({ siteURL: "https://status.example.com", siteName: "Example", colors: {} })),
}));

import { NotifySubscribersOfStatusChange } from "./statusChangeController.js";

const notify = (status: string, ts: number, type = "REALTIME") =>
  NotifySubscribersOfStatusChange("web", ts, status, type);

describe("NotifySubscribersOfStatusChange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastStatus.clear();
    db.getMonitorByTag.mockResolvedValue({ tag: "web", name: "Website", is_hidden: "NO" });
  });

  it("takes the first status it sees as the baseline, without a mail", async () => {
    await notify("DOWN", 60);

    expect(subscriberQueue.push).not.toHaveBeenCalled();
    expect(lastStatus.get("web")).toEqual({ status: "DOWN", ts: 60 });
  });

  it("mails the monitor's subscribers when its status changes", async () => {
    await notify("UP", 60);
    await notify("DOWN", 120);

    expect(subscriberQueue.push).toHaveBeenCalledOnce();
    const [variables, monitorTags, options] = subscriberQueue.push.mock.calls[0];
    expect(monitorTags).toEqual(["web"]);
    expect(variables).toMatchObject({
      title: "Website is DOWN",
      update_subject: "[DOWN] Website",
      cta_url: "https://status.example.com/monitors/web",
      event_type: "monitors",
      update_state: "DOWN",
      is_up: false,
      is_down: true,
      is_degraded: false,
    });
    expect(variables.update_text).toContain("<strong>UP</strong> to <strong>DOWN</strong>");
    expect(options).toEqual({ deduplication: { id: "subscriber-monitors-web-120" } });
  });

  it("mails on every change between UP, DEGRADED and DOWN, and not while the status holds", async () => {
    for (const [ts, status] of [
      [60, "UP"],
      [120, "UP"],
      [180, "DEGRADED"],
      [240, "DEGRADED"],
      [300, "DOWN"],
      [360, "UP"],
    ] as const) {
      await notify(status, ts);
    }

    expect(subscriberQueue.push.mock.calls.map(([v]) => v.update_state)).toEqual(["DEGRADED", "DOWN", "UP"]);
  });

  it("sees through a NO_DATA gap: a gap is not a change, and the status after it is compared with the one before", async () => {
    await notify("UP", 60);
    await notify("NO_DATA", 120);
    await notify("UP", 180);
    expect(subscriberQueue.push).not.toHaveBeenCalled();

    await notify("NO_DATA", 240);
    await notify("DOWN", 300);
    expect(subscriberQueue.push.mock.calls.map(([v]) => v.update_text)).toEqual([
      expect.stringContaining("<strong>UP</strong> to <strong>DOWN</strong>"),
    ]);
  });

  it("leaves incident and maintenance rows to their own mails", async () => {
    await notify("UP", 60);
    await notify("DOWN", 120, "INCIDENT");
    await notify("MAINTENANCE", 180, "MAINTENANCE");
    await notify("DEGRADED", 240, "MAINTENANCE");
    await notify("UP", 300);

    expect(subscriberQueue.push).not.toHaveBeenCalled();
    expect(lastStatus.get("web")).toEqual({ status: "UP", ts: 300 });
  });

  it("ignores a minute older than the last one seen", async () => {
    await notify("UP", 300);
    await notify("DOWN", 240);
    await notify("DOWN", 300);

    expect(subscriberQueue.push).not.toHaveBeenCalled();
    expect(lastStatus.get("web")).toEqual({ status: "UP", ts: 300 });
  });

  it("sends nothing for a hidden monitor, but keeps its status current", async () => {
    db.getMonitorByTag.mockResolvedValue({ tag: "web", name: "Website", is_hidden: "YES" });
    await notify("UP", 60);
    await notify("DOWN", 120);

    expect(subscriberQueue.push).not.toHaveBeenCalled();
    expect(lastStatus.get("web")).toEqual({ status: "DOWN", ts: 120 });
  });
});

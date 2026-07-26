import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import StatusBarCalendar from "./StatusBarCalendar.svelte";
import type { TimestampStatusCount } from "$lib/server/types/db";

// The browser context is pinned to UTC (see vite.config.ts), so the timezone store
// (which defaults to browser TZ) is deterministic; noon UTC keeps fixtures safe too.
const NOON_UTC = 1768478400; // 2026-01-15T12:00:00Z

const day = (overrides: Partial<TimestampStatusCount>): TimestampStatusCount => ({
  ts: NOON_UTC,
  countOfUp: 0,
  countOfDown: 0,
  countOfDegraded: 0,
  countOfMaintenance: 0,
  avgLatency: 0,
  maxLatency: 0,
  minLatency: 0,
  latencyCount: 0,
  ...overrides,
});

describe("StatusBarCalendar", () => {
  it("labels the canvas with the number of days", async () => {
    const data = [day({ countOfUp: 10 }), day({ countOfUp: 10 }), day({ countOfUp: 10 })];
    const screen = await render(StatusBarCalendar, { data, monitorTag: "test-monitor", disableClick: true });

    await expect.element(screen.getByLabelText("Status calendar showing 3-day uptime data")).toBeInTheDocument();
  });

  it("shows status summary, date, and latency in the tooltip of the hovered day", async () => {
    // Three bars: hovering the canvas center lands on the middle bar (index 1),
    // which is 90% down => "Major System Outage" (>= 75% threshold).
    const data = [
      day({ countOfUp: 100 }),
      day({ countOfDown: 90, countOfUp: 10, avgLatency: 250 }),
      day({ countOfUp: 90, countOfDegraded: 10 }),
    ];
    const screen = await render(StatusBarCalendar, { data, monitorTag: "test-monitor", disableClick: true });

    await screen.getByLabelText("Status calendar showing 3-day uptime data").hover();

    await expect.element(screen.getByText("Major System Outage")).toBeInTheDocument();
    // page.data.dateAndTimeFormat.dateOnly is mocked as "yyyy-MM-dd" in vitest-setup-client.ts
    await expect.element(screen.getByText("2026-01-15", { exact: false })).toBeInTheDocument();
    await expect.element(screen.getByText("250ms")).toBeInTheDocument();
  });

  it("reports a partial outage when downtime is below the 75% threshold", async () => {
    const data = [day({ countOfUp: 100 }), day({ countOfDown: 20, countOfUp: 80 }), day({ countOfUp: 100 })];
    const screen = await render(StatusBarCalendar, { data, monitorTag: "test-monitor", disableClick: true });

    await screen.getByLabelText("Status calendar showing 3-day uptime data").hover();

    await expect.element(screen.getByText("Partial System Outage")).toBeInTheDocument();
  });

  it("formats the tooltip value with a custom unit", async () => {
    const data = [
      day({ countOfUp: 100, avgLatency: 42, latencyCount: 100 }),
      day({ countOfUp: 100, avgLatency: 42, latencyCount: 100 }),
      day({ countOfUp: 100, avgLatency: 42, latencyCount: 100 }),
    ];
    const screen = await render(StatusBarCalendar, {
      data,
      monitorTag: "test-monitor",
      disableClick: true,
      valueDisplay: { name: "Queue length", unit: "items" },
    });

    await screen.getByLabelText("Status calendar showing 3-day uptime data").hover();

    await expect.element(screen.getByText("42 items")).toBeInTheDocument();
  });

  it("shows a zero reading for custom units instead of hiding it", async () => {
    // avgLatency 0 with latencyCount > 0 is a real reading of 0 (e.g. an empty queue), not a
    // NULL/no-reading day, so it must still be shown.
    const data = [
      day({ countOfUp: 100, avgLatency: 0, latencyCount: 100 }),
      day({ countOfUp: 100, avgLatency: 0, latencyCount: 100 }),
      day({ countOfUp: 100, avgLatency: 0, latencyCount: 100 }),
    ];
    const screen = await render(StatusBarCalendar, {
      data,
      monitorTag: "test-monitor",
      disableClick: true,
      valueDisplay: { unit: "items" },
    });

    await screen.getByLabelText("Status calendar showing 3-day uptime data").hover();

    await expect.element(screen.getByText("0 items")).toBeInTheDocument();
  });

  it("does not fabricate a reading when checks ran but all readings were NULL", async () => {
    // countOfUp: 100 means checks ran, but latencyCount: 0 means every reading was NULL
    // (the SQL aggregate is NULL, mapped to avgLatency 0). The tooltip must not show "0 items".
    const data = [
      day({ countOfUp: 100, latencyCount: 0, avgLatency: 0 }),
      day({ countOfUp: 100, latencyCount: 0, avgLatency: 0 }),
      day({ countOfUp: 100, latencyCount: 0, avgLatency: 0 }),
    ];
    const screen = await render(StatusBarCalendar, {
      data,
      monitorTag: "test-monitor",
      disableClick: true,
      valueDisplay: { unit: "items" },
    });

    await screen.getByLabelText("Status calendar showing 3-day uptime data").hover();

    await expect.element(screen.getByText("All Systems Operational")).toBeInTheDocument();
    await expect.element(screen.getByText("0 items")).not.toBeInTheDocument();
  });
});

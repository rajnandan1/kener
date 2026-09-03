import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import LocalTime from "./LocalTime.harness.svelte";

// Browser context is pinned to UTC (vite.config.ts), so the offset label is "GMT".
const EPOCH = 1787198520; // 2026-08-20T04:02:00Z

describe("LocalTime", () => {
  it("renders a naive DB string as local time with the GMT offset", async () => {
    const screen = await render(LocalTime, { value: "2026-08-20 04:02:00" });
    await expect.element(screen.getByText("2026-08-20 04:02:00 GMT")).toBeInTheDocument();
  });

  it("accepts epoch seconds and a custom format", async () => {
    const screen = await render(LocalTime, { value: EPOCH, format: "MMM d, yyyy HH:mm" });
    await expect.element(screen.getByText("Aug 20, 2026 04:02 GMT")).toBeInTheDocument();
  });

  it("shows the UTC time in a tooltip on hover", async () => {
    const screen = await render(LocalTime, { value: EPOCH });
    await screen.getByText("2026-08-20 04:02:00 GMT").hover();
    await expect.element(screen.getByText("2026-08-20 04:02:00 UTC")).toBeInTheDocument();
  });

  it("falls back to the raw value instead of throwing on an unparseable input", async () => {
    const screen = await render(LocalTime, { value: "not-a-date" });
    await expect.element(screen.getByText("not-a-date")).toBeInTheDocument();
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import LocalTime from "./LocalTime.harness.svelte";

// Browser context is pinned to UTC; date-fns token O renders its offset as GMT+0.
const EPOCH = 1787198520; // 2026-08-20T04:02:00Z

afterEach(() => {
  document.cookie = "kener_admin_locale=; Path=/; Max-Age=0";
});

describe("LocalTime", () => {
  it.each([
    ["en", "20 August 2026 GMT+0"],
    ["pl", "20 sierpnia 2026 GMT+0"],
    ["cs", "20 srpna 2026 GMT+0"],
  ] as const)("uses the registered %s locale for month names", async (initialLocale, expected) => {
    const screen = await render(LocalTime, { value: EPOCH, format: "d MMMM yyyy", initialLocale });
    await expect.element(screen.getByText(expected, { exact: true })).toBeInTheDocument();
  });

  it("uses the Czech standalone month name for LLLL", async () => {
    const screen = await render(LocalTime, { value: EPOCH, format: "LLLL", initialLocale: "cs" });
    await expect.element(screen.getByText("srpen GMT+0", { exact: true })).toBeInTheDocument();
  });

  it("refreshes the formatted month after changing the panel language", async () => {
    const screen = await render(LocalTime, { value: EPOCH, format: "d MMMM yyyy", initialLocale: "pl" });
    await expect.element(screen.getByText("20 sierpnia 2026 GMT+0", { exact: true })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Język panelu" }), "cs");
    await expect.element(screen.getByText("20 srpna 2026 GMT+0", { exact: true })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Jazyk panelu" }), "en");
    await expect.element(screen.getByText("20 August 2026 GMT+0", { exact: true })).toBeInTheDocument();
  });

  it("preserves the public formatter even when a Czech panel preference exists", async () => {
    document.cookie = "kener_admin_locale=cs; Path=/; SameSite=Lax";
    const screen = await render(LocalTime, { value: EPOCH, format: "d MMMM yyyy" });
    await expect.element(screen.getByText("20 August 2026 GMT+0", { exact: true })).toBeInTheDocument();
    expect(screen.container.querySelector("select")).toBeNull();
  });
  it("renders a naive DB string as local time with the GMT offset", async () => {
    const screen = await render(LocalTime, { value: "2026-08-20 04:02:00" });
    await expect.element(screen.getByText("2026-08-20 04:02:00 GMT+0")).toBeInTheDocument();
  });

  it("accepts epoch seconds and a custom format", async () => {
    const screen = await render(LocalTime, { value: EPOCH, format: "MMM d, yyyy HH:mm" });
    await expect.element(screen.getByText("Aug 20, 2026 04:02 GMT+0")).toBeInTheDocument();
  });

  it("shows the UTC time in a tooltip on hover", async () => {
    const screen = await render(LocalTime, { value: EPOCH });
    await screen.getByText("2026-08-20 04:02:00 GMT+0").hover();
    await expect.element(screen.getByText("2026-08-20 04:02:00 UTC")).toBeInTheDocument();
  });

  it("falls back to the raw value instead of throwing on an unparseable input", async () => {
    const screen = await render(LocalTime, { value: "not-a-date" });
    await expect.element(screen.getByText("not-a-date")).toBeInTheDocument();
  });
});

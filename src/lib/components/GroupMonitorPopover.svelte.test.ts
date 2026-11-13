import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRawSnippet } from "svelte";
import { render } from "vitest-browser-svelte";
import { page as browserPage } from "vitest/browser";
import type { MonitorBarResponse } from "$lib/server/api-server/monitor-bar/get";
import GroupMonitorPopover from "./GroupMonitorPopover.svelte";

const { requestMonitorBar } = vi.hoisted(() => ({ requestMonitorBar: vi.fn() }));
vi.mock("$lib/client/monitor-bar-client", () => ({ requestMonitorBar, clearMonitorBarCache: vi.fn() }));

const barFor = (tag: string) =>
  ({
    name: `Member ${tag}`,
    description: "",
    image: "",
    monitorType: "API",
    currentStatus: "UP",
    uptime: "100",
    avgLatency: "10ms",
    uptimeData: [],
    fromTimeStamp: 1768392000,
    toTimeStamp: 1768478400,
  }) as unknown as MonitorBarResponse;

const label = createRawSnippet(() => ({ render: () => "<span>Included Monitors</span>" }));
const props = { tags: ["api", "db"], days: 7, endOfDayTodayAtTz: 1768478400, children: label };

describe("GroupMonitorPopover", () => {
  beforeEach(() => {
    requestMonitorBar.mockReset();
    requestMonitorBar.mockImplementation((tag: string) => Promise.resolve(barFor(tag)));
  });

  it("expands the members below the button and collapses them again when INLINE", async () => {
    const screen = await render(GroupMonitorPopover, { ...props, display: "INLINE" });
    const button = screen.getByRole("button", { name: "Included Monitors" });

    await expect.element(button).toHaveAttribute("aria-expanded", "false");
    await expect.element(screen.getByText("Member api")).not.toBeInTheDocument();
    expect(requestMonitorBar).not.toHaveBeenCalled();

    await button.click();

    await expect.element(button).toHaveAttribute("aria-expanded", "true");
    await expect.element(screen.getByText("Member api")).toBeInTheDocument();
    await expect.element(screen.getByText("Member db")).toBeInTheDocument();
    expect(requestMonitorBar).toHaveBeenCalledWith("api", 7, 1768478400);
    expect(requestMonitorBar).toHaveBeenCalledWith("db", 7, 1768478400);
    await expect.element(browserPage.getByRole("dialog")).not.toBeInTheDocument();

    await button.click();

    await expect.element(button).toHaveAttribute("aria-expanded", "false");
    // Tailwind does not load in component tests, so this checks the class that hides the panel.
    const member = screen.getByText("Member api");
    await expect.element(member).toBeInTheDocument();
    const panel = member.element().closest(".grid");
    expect(panel).toHaveClass("invisible", "grid-rows-[0fr]");
    expect(button.element().getAttribute("aria-controls")).toBe(panel?.id);
    expect(requestMonitorBar).toHaveBeenCalledTimes(2);
  });

  it("retries a failed member when the list reopens", async () => {
    requestMonitorBar.mockRejectedValueOnce(new Error("offline"));
    const screen = await render(GroupMonitorPopover, { ...props, tags: ["api"], display: "INLINE" });
    const button = screen.getByRole("button", { name: "Included Monitors" });

    await button.click();
    await expect.element(screen.getByText("Failed to load monitor: offline")).toBeInTheDocument();

    await button.click();
    await button.click();

    await expect.element(screen.getByText("Member api")).toBeInTheDocument();
  });

  it.each([
    { compactMembers: false, hasBars: true },
    { compactMembers: true, hasBars: false },
  ])("shows member bars: $hasBars when compactMembers is $compactMembers", async ({ compactMembers, hasBars }) => {
    const screen = await render(GroupMonitorPopover, { ...props, display: "INLINE", compactMembers });

    await screen.getByRole("button", { name: "Included Monitors" }).click();

    await expect.element(screen.getByText("Member api")).toBeInTheDocument();
    expect(screen.container.querySelector("canvas") !== null).toBe(hasBars);
  });

  it("shows hidden members as one sign-in row and never requests them", async () => {
    const screen = await render(GroupMonitorPopover, { ...props, tags: ["api"], hiddenCount: 2, display: "INLINE" });

    await screen.getByRole("button", { name: "Included Monitors" }).click();

    await expect.element(screen.getByText("Member api")).toBeInTheDocument();
    // Component tests load no translations, so $t returns the key text.
    await expect.element(screen.getByTestId("group-hidden-members")).toHaveTextContent(/private monitors\./);
    await expect
      .element(screen.getByRole("link", { name: "Sign in to see them." }))
      .toHaveAttribute("href", expect.stringContaining("/account/signin"));
    await expect.element(screen.getByText(/Failed to load monitor/)).not.toBeInTheDocument();
    expect(requestMonitorBar).toHaveBeenCalledTimes(1);
  });

  it("shows only the sign-in row when every member is hidden", async () => {
    const screen = await render(GroupMonitorPopover, { ...props, tags: [], hiddenCount: 3, display: "INLINE" });

    await screen.getByRole("button", { name: "Included Monitors" }).click();

    await expect.element(screen.getByTestId("group-hidden-members")).toBeInTheDocument();
    await expect.element(screen.getByText("No monitors available.")).not.toBeInTheDocument();
    expect(requestMonitorBar).not.toHaveBeenCalled();
  });

  it("opens the members in a drawer when no display is set", async () => {
    const screen = await render(GroupMonitorPopover, props);

    await screen.getByRole("button", { name: "Included Monitors" }).click();

    const drawer = browserPage.getByRole("dialog");
    await expect.element(drawer.getByText("Member api")).toBeInTheDocument();
    await expect.element(drawer.getByText("Member db")).toBeInTheDocument();
  });
});

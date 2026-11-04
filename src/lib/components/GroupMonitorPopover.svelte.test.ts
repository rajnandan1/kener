import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { createRawSnippet } from "svelte";
import GroupMonitorPopover from "./GroupMonitorPopover.svelte";
import type { PageMonitorLayoutStyle } from "$lib/types/api";

const tags = ["api", "web", "db"];
const children = createRawSnippet(() => ({ render: () => "<span>Included Monitors</span>" }));
let endOfDay = 1_800_000_000;

// Opens the drawer with the members still loading, so each one shows its skeleton.
async function openWith(layoutStyle?: PageMonitorLayoutStyle) {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise(() => {})),
  );
  // A fresh day each time, so the monitor-bar client's cache never answers for a previous test.
  endOfDay += 86400;
  const screen = await render(GroupMonitorPopover, {
    tags,
    days: 30,
    endOfDayTodayAtTz: endOfDay,
    layoutStyle,
    children,
  });
  await screen.getByRole("button", { name: "Included Monitors" }).click();
  await vi.waitFor(() => expect(document.querySelector("[data-layout]")).not.toBeNull());
  const container = document.querySelector("[data-layout]") as HTMLElement;
  const items = [...container.children] as HTMLElement[];
  const skeletonsPerItem = items.map((item) => item.querySelectorAll('[data-slot="skeleton"]').length);
  return { container, items, skeletonsPerItem };
}

describe("GroupMonitorPopover layouts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the full-width list with status bars when the group has no layout saved", async () => {
    const { container, items, skeletonsPerItem } = await openWith(undefined);

    expect(container.dataset.layout).toBe("default-list");
    expect(container.className).not.toContain("grid");
    expect(items.map((item) => item.classList.contains("border-b"))).toEqual([true, true, false]);
    expect(Math.min(...skeletonsPerItem)).toBeGreaterThan(50);
  });

  it("lays the members out in a grid with status bars for default-grid", async () => {
    const { container, items, skeletonsPerItem } = await openWith("default-grid");

    expect(container.className).toContain("md:grid-cols-4");
    expect(items[2].className).toContain("md:col-span-4");
    expect(Math.min(...skeletonsPerItem)).toBeGreaterThan(50);
  });

  it.each([
    ["compact-list", ""],
    ["compact-grid", "lg:grid-cols-6"],
  ] as const)("drops the status bars in %s", async (layoutStyle, gridClass) => {
    const { container, skeletonsPerItem } = await openWith(layoutStyle);

    if (gridClass) expect(container.className).toContain(gridClass);
    else expect(container.className).not.toContain("grid");
    expect(Math.max(...skeletonsPerItem)).toBeLessThan(10);
  });
});

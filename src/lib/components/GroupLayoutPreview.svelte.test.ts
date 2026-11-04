import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import GroupLayoutPreview from "./GroupLayoutPreview.svelte";

const members = [
  { tag: "api", name: "Public API" },
  { tag: "web", name: "Website" },
  { tag: "db", name: "Database" },
];

describe("GroupLayoutPreview", () => {
  it("redraws the moment the layout changes", async () => {
    const screen = await render(GroupLayoutPreview, { members, layoutStyle: "default-list" });
    const preview = () => screen.getByRole("img", { name: "Layout preview" }).element() as HTMLElement;

    await expect.element(screen.getByText("Website")).toBeInTheDocument();
    expect(preview().className).not.toContain("grid-cols-4");
    expect(preview().querySelectorAll('[data-testid="layout-preview-bar"]')).toHaveLength(3);

    await screen.rerender({ members, layoutStyle: "compact-grid" });

    expect(preview().dataset.layout).toBe("compact-grid");
    expect(preview().className).toContain("lg:grid-cols-6");
    expect(preview().querySelectorAll('[data-testid="layout-preview-bar"]')).toHaveLength(0);
  });

  it("asks for members when the group has none yet", async () => {
    const screen = await render(GroupLayoutPreview, { members: [], layoutStyle: "default-grid" });

    await expect.element(screen.getByText("Add monitors to the group to preview the layout")).toBeInTheDocument();
  });
});

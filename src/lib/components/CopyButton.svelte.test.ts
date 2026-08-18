import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import CopyButton from "./CopyButton.svelte";

// The clipboard is spied on rather than read back: headless Chromium does not
// grant clipboard-read permission, and the component's contract is "calls
// navigator.clipboard.writeText and flips to the copied state".
describe("CopyButton", () => {
  beforeAll(() => {
    // navigator.clipboard only exists in secure contexts; provide a minimal
    // stand-in when absent so the spies below always have a target.
    if (!("clipboard" in navigator)) {
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: async () => {} },
        configurable: true,
      });
    }
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("copies the text prop and shows the copied state on click", async () => {
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

    const screen = await render(CopyButton, { text: "copy-me" });
    const copiedTooltip = screen.getByText("Copied");

    // Hidden before the click (class-based visibility)
    await expect.element(copiedTooltip).toHaveClass(/opacity-0/);

    await screen.getByRole("button").click();

    expect(writeText).toHaveBeenCalledExactlyOnceWith("copy-me");
    await expect.element(copiedTooltip).toHaveClass(/scale-100/);
  });

  it("invokes the onclick callback", async () => {
    vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    const onclick = vi.fn();

    const screen = await render(CopyButton, { text: "x", onclick });
    await screen.getByRole("button").click();

    expect(onclick).toHaveBeenCalledOnce();
  });

  it("does not touch the clipboard when no text is provided", async () => {
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

    const screen = await render(CopyButton, {});
    await screen.getByRole("button").click();

    expect(writeText).not.toHaveBeenCalled();
  });
});

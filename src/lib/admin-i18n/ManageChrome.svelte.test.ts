import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import Harness from "./ManageChrome.harness.svelte";

afterEach(async () => {
  document.cookie = "kener_admin_locale=; Path=/; Max-Age=0";
  document.cookie = "sidebar_state=; Path=/; Max-Age=0";
  await page.viewport(1024, 768);
});

function expectHeaderFits(): void {
  const header = document.querySelector("header")!;
  const controls = [...header.querySelectorAll<HTMLElement>("h1, select, a, button")];
  expect(controls).toHaveLength(5);
  const bounds = controls.map((element) => element.getBoundingClientRect());
  for (const [index, rect] of bounds.entries()) {
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);
    expect(rect.left).toBeGreaterThanOrEqual(0);
    expect(rect.right).toBeLessThanOrEqual(window.innerWidth);
    const element = controls[index];
    const target = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    expect(element === target || element.contains(target)).toBe(true);
    for (const other of bounds.slice(index + 1)) {
      const overlapWidth = Math.min(rect.right, other.right) - Math.max(rect.left, other.left);
      const overlapHeight = Math.min(rect.bottom, other.bottom) - Math.max(rect.top, other.top);
      expect(overlapWidth <= 0 || overlapHeight <= 0).toBe(true);
    }
  }
  expect(header.scrollWidth).toBeLessThanOrEqual(header.clientWidth);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
}

describe("management navigation localization", () => {
  it("keeps the title, language selector and both links usable at 375px in Polish and English", async () => {
    await page.viewport(375, 812);
    const screen = await render(Harness);
    await expect.element(screen.getByRole("heading", { name: "Konfiguracja witryny" })).toBeVisible();
    await expect.element(screen.getByRole("link", { name: "Strona statusowa", exact: true })).toBeVisible();
    await expect.element(screen.getByRole("link", { name: "Dokumentacja", exact: true })).toBeVisible();
    expectHeaderFits();

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Język panelu" }), "en");
    await expect.element(screen.getByRole("heading", { name: "Site Configurations" })).toBeVisible();
    await expect.element(screen.getByRole("link", { name: "Status Page", exact: true })).toHaveAttribute("href", "/");
    await expect
      .element(screen.getByRole("link", { name: "Documentation", exact: true }))
      .toHaveAttribute("href", "https://kener.ing/docs");
    expectHeaderFits();
  });

  it("uses the active language for collapsed-menu tooltips as well as their link labels", async () => {
    await page.viewport(1024, 768);
    const screen = await render(Harness, { collapsed: true });
    await screen.getByRole("link", { name: "Konfiguracja witryny", exact: true }).hover();
    await vi.waitFor(() =>
      expect(document.querySelector("[data-tooltip-content]")?.textContent?.trim()).toBe("Konfiguracja witryny"),
    );
    await expect
      .element(page.elementLocator(document.querySelector<HTMLElement>("[data-tooltip-content]")!))
      .toHaveAttribute("lang", "pl");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Język panelu" }), "en");
    await screen.getByRole("link", { name: "Site Configurations", exact: true }).hover();
    await expect
      .element(page.elementLocator(document.querySelector<HTMLElement>("[data-tooltip-content]")!))
      .toHaveTextContent("Site Configurations");
    await expect
      .element(page.elementLocator(document.querySelector<HTMLElement>("[data-tooltip-content]")!))
      .toHaveAttribute("lang", "en");
  });

  it.each([
    ["pl", "Pokaż lub ukryj panel boczny", "Panel boczny"],
    ["en", "Toggle Sidebar", "Sidebar"],
  ] as const)(
    "marks the portaled mobile sidebar with its %s panel language",
    async (initialLocale, triggerName, dialogName) => {
      await page.viewport(375, 812);
      const screen = await render(Harness, { initialLocale });
      await screen.getByRole("button", { name: triggerName }).click();
      const sidebar = page.getByRole("dialog", { name: dialogName });
      await expect.element(sidebar).toHaveAttribute("lang", initialLocale);
      await expect.element(sidebar).toHaveAttribute("data-slot", "sidebar");
      expect(screen.getByTestId("admin-main").element().contains(sidebar.element())).toBe(false);
    },
  );
});

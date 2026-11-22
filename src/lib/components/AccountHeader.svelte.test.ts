import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import Harness from "./AccountHeader.harness.svelte";

vi.mock("$app/state", () => ({
  page: {
    data: {
      siteName: "Status Example",
      logo: "",
      navItems: [
        {
          name: "Documentation",
          url: "https://kener.ing/docs/",
          iconURL: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E",
        },
        { name: "Login", url: "/account/signin", iconURL: "" },
        { name: "Documentation", url: "https://example.com/handbook", iconURL: "" },
        { name: "Save", url: "https://kener.ing/docs", iconURL: "" },
        { name: "Login", url: "/custom-login", iconURL: "" },
      ],
      globalPageVisibilitySettings: { forceExclusivity: false },
    },
    params: {},
  },
}));

afterEach(async () => {
  document.cookie = "kener_admin_locale=; Path=/; Max-Age=0";
  await page.viewport(1024, 768);
});

function expectSelectorBelowNavigation(): void {
  const nav = document.querySelector<HTMLElement>('[data-slot="kener-nav"]')!;
  const selector = document.querySelector<HTMLSelectElement>("header select")!;
  expect(getComputedStyle(nav).position).toBe("relative");
  const navBounds = nav.getBoundingClientRect();
  const selectorBounds = selector.getBoundingClientRect();
  expect(navBounds.height).toBeGreaterThan(0);
  expect(selectorBounds.top).toBeGreaterThanOrEqual(navBounds.bottom);
  expect(
    document.elementFromPoint(
      selectorBounds.left + selectorBounds.width / 2,
      selectorBounds.top + selectorBounds.height / 2,
    ),
  ).toBe(selector);
}

describe("account header", () => {
  it("switches the default links and icon labels between PL and EN, keeping custom navigation untouched", async () => {
    await page.viewport(1024, 768);
    const screen = await render(Harness, { initialLocale: "pl" });
    await expect.element(screen.getByRole("link", { name: /^Dokumentacja/ })).toBeVisible();
    await expect.element(screen.getByRole("img", { name: "Dokumentacja", exact: true })).toBeVisible();
    await expect.element(screen.getByRole("link", { name: "Zaloguj się", exact: true })).toBeVisible();
    await expect
      .element(screen.getByRole("link", { name: "Documentation", exact: true }))
      .toHaveAttribute("href", "https://example.com/handbook");
    await expect.element(screen.getByRole("link", { name: "Save", exact: true })).toBeVisible();
    await expect
      .element(screen.getByRole("link", { name: "Login", exact: true }))
      .toHaveAttribute("href", "/custom-login");
    expectSelectorBelowNavigation();

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Język panelu" }), "en");
    await expect.element(screen.getByRole("img", { name: "Documentation", exact: true })).toBeVisible();
    await expect.element(screen.getByRole("combobox", { name: "Panel language" })).toBeVisible();
    const login = Array.from(document.querySelectorAll("a")).find(
      (link) => link.getAttribute("href") === "/account/signin",
    )!;
    expect(login.textContent?.trim()).toBe("Login");
    expectSelectorBelowNavigation();
  });

  it("keeps the language selector visible and the translated mobile menu functional", async () => {
    await page.viewport(390, 844);
    const screen = await render(Harness, { initialLocale: "pl" });
    await expect.element(screen.getByRole("combobox", { name: "Język panelu" })).toBeVisible();
    expectSelectorBelowNavigation();
    await screen.getByRole("button", { name: "Otwórz menu nawigacji" }).click();
    await expect.element(screen.getByRole("link", { name: /^Dokumentacja/ })).toBeVisible();
    await expect.element(screen.getByRole("link", { name: "Zaloguj się", exact: true })).toBeVisible();
    await expect.element(screen.getByRole("link", { name: "Save", exact: true })).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expectSelectorBelowNavigation());
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Język panelu" }), "en");
    await expect.element(screen.getByRole("button", { name: "Open navigation menu" })).toBeVisible();
    expectSelectorBelowNavigation();
  });

  it("keeps public navigation fixed and leaves its original names unchanged", async () => {
    await page.viewport(1024, 768);
    const screen = await render(Harness, { initialLocale: "pl", publicNavigation: true });
    const nav = document.querySelector<HTMLElement>('[data-slot="kener-nav"]')!;
    expect(getComputedStyle(nav).position).toBe("fixed");
    await expect.element(screen.getByRole("img", { name: "Documentation", exact: true })).toBeVisible();
    expect(document.querySelector("select")).toBeNull();
    expect(document.querySelector("a[href='/account/signin']")?.textContent?.trim()).toBe("Login");
    expect(document.querySelector("a[href='https://kener.ing/docs']")?.textContent?.trim()).toBe("Save");
  });
});

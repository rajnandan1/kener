import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import type { AdminI18nContext } from "./context";
import Harness from "./PortalLanguage.harness.svelte";

const kinds = [
  "dialog",
  "sheet",
  "alert-dialog",
  "tooltip",
  "popover",
  "dropdown-menu",
  "dropdown-menu-sub",
  "select",
  "hover-card",
] as const;
const documentLanguage = document.documentElement.getAttribute("lang");

afterEach(() => {
  document.cookie = "kener_admin_locale=; Path=/; Max-Age=0";
  if (documentLanguage === null) document.documentElement.removeAttribute("lang");
  else document.documentElement.lang = documentLanguage;
});

describe("portaled content language", () => {
  it.each(kinds)("keeps an open %s in the active panel language after it leaves main", async (kind) => {
    let context!: AdminI18nContext;
    const screen = await render(Harness, {
      kind,
      onContext: (value) => {
        context = value;
      },
    });
    const content = page.getByTestId("portal-content");
    await expect.element(content).toHaveAttribute("lang", "pl");
    await expect.element(content).toHaveTextContent("Zapisz");
    expect(screen.getByTestId("main-boundary").element().contains(content.element())).toBe(false);
    context.setLocale("en");
    await expect.element(content).toHaveAttribute("lang", "en");
    await expect.element(content).toHaveTextContent("Save");
    context.setLocale("pl");
    await expect.element(content).toHaveAttribute("lang", "pl");
  });

  it.each(kinds)("leaves public %s language inheritance unchanged", async (kind) => {
    document.documentElement.lang = "fr";
    await render(Harness, { kind, admin: false });
    const content = page.getByTestId("portal-content");
    await expect.element(content).toBeInTheDocument();
    expect(content.element().hasAttribute("lang")).toBe(false);
    expect(content.element().closest("[lang]")?.getAttribute("lang")).toBe("fr");
  });

  it("preserves an explicitly requested content language", async () => {
    let context!: AdminI18nContext;
    await render(Harness, {
      explicitLang: "de",
      onContext: (value) => {
        context = value;
      },
    });
    const content = page.getByTestId("portal-content");
    await expect.element(content).toHaveAttribute("lang", "de");
    context.setLocale("en");
    await expect.element(content).toHaveAttribute("lang", "de");
  });
});

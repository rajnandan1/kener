import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import Harness from "./AdminI18n.harness.svelte";

afterEach(() => {
  document.cookie = "kener_admin_locale=; Path=/; Max-Age=0";
});

describe("panel language switcher", () => {
  it("changes rendered labels immediately and persists a separate preference", async () => {
    const screen = await render(Harness, { initialLocale: "pl", userText: "Save" });
    await expect.element(screen.getByTestId("translated")).toHaveTextContent("Zapisz");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Język panelu" }), "en");
    await expect.element(screen.getByTestId("translated")).toHaveTextContent("Save");
    expect(document.cookie).toContain("kener_admin_locale=en");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Panel language" }), "pl");
    await expect.element(screen.getByTestId("translated")).toHaveTextContent("Zapisz");
    await expect.element(screen.getByTestId("user-text")).toHaveTextContent("Save");
  });
  it("switches Czech, English and Polish without changing user-authored content", async () => {
    const screen = await render(Harness, { initialLocale: "en", userText: "Save" });
    await expect.element(screen.getByRole("option", { name: "Čeština" })).toHaveAttribute("lang", "cs");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Panel language", exact: true }), "cs");
    const czechSelector = screen.getByRole("combobox", { name: "Jazyk panelu", exact: true });
    await expect.element(czechSelector).toHaveValue("cs");
    await expect.element(screen.getByTestId("translated")).toHaveTextContent("Uložit");
    expect(document.cookie).toContain("kener_admin_locale=cs");
    await expect.element(screen.getByTestId("user-text")).toHaveTextContent("Save");
    await userEvent.selectOptions(czechSelector, "pl");
    await expect.element(screen.getByTestId("translated")).toHaveTextContent("Zapisz");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Język panelu", exact: true }), "en");
    await expect.element(screen.getByTestId("translated")).toHaveTextContent("Save");
  });
});

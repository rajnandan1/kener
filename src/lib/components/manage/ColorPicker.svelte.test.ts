import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import { toast } from "svelte-sonner";
import Harness from "./ColorPicker.harness.svelte";

afterEach(() => {
  toast.dismiss();
  document.cookie = "kener_admin_locale=; Path=/; Max-Age=0";
});

describe("localized vendor controls", () => {
  it("keeps popup and input text readable when the surrounding app uses a dark theme", async () => {
    const screen = await render(Harness, { dark: true });
    await screen.getByText("Wybierz kolor", { exact: true }).click();
    const popup = document.querySelector<HTMLElement>('[data-slot="color-picker-dialog"]')!;
    const input = page.getByRole("textbox", { name: "Kolor HEX", exact: true }).element();
    const luminance = (color: string) => {
      const channels = color
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number)
        .map((channel) => {
          const value = channel / 255;
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    for (const element of [popup, input]) {
      const style = getComputedStyle(element);
      const foreground = luminance(style.color);
      const background = luminance(style.backgroundColor);
      expect(
        (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("preserves an initial non-red hex value against the default RGB and HSV channels", async () => {
    const onInput = vi.fn();
    const screen = await render(Harness, { onInput });
    await expect.element(screen.getByTestId("picker-hex")).toHaveTextContent("#16a34a");
    await vi.waitFor(() =>
      expect(onInput).toHaveBeenCalledWith(
        expect.objectContaining({ hex: "#16a34a", rgb: expect.objectContaining({ r: 22, g: 163, b: 74 }) }),
      ),
    );
    await screen.getByText("Wybierz kolor", { exact: true }).click();
    await expect.element(page.getByRole("textbox", { name: "Kolor HEX", exact: true })).toHaveValue("#16a34a");
  });

  it("keeps color bindings and vendor close behavior while translating the picker in PL and EN", async () => {
    const onInput = vi.fn();
    const screen = await render(Harness, { onInput });
    await screen.getByText("Wybierz kolor", { exact: true }).click();
    await expect.element(page.getByRole("dialog", { name: "Wybór koloru", exact: true })).toBeVisible();
    await page.getByRole("textbox", { name: "Kolor HEX", exact: true }).fill("#abcdef");
    await expect.element(screen.getByTestId("picker-hex")).toHaveTextContent("#abcdef");
    await vi.waitFor(() => expect(onInput).toHaveBeenCalledWith(expect.objectContaining({ hex: "#abcdef" })));
    await page.getByRole("button", { name: "Zmień format koloru na rgb", exact: true }).click();
    await page.getByRole("spinbutton", { name: "Składowa czerwona", exact: true }).fill("200");
    await expect.element(screen.getByTestId("picker-hex")).toHaveTextContent("#c8cdef");
    await screen.getByRole("button", { name: "Outside target", exact: true }).click();
    expect(document.querySelector<HTMLElement>('[data-slot="color-picker-dialog"]')?.style.display).toBe("none");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Język panelu" }), "en");
    await screen.getByText("Choose a color", { exact: true }).click();
    await expect.element(page.getByRole("dialog", { name: "Color picker", exact: true })).toBeVisible();
    page.getByRole("spinbutton", { name: "red channel", exact: true }).element().focus();
    await userEvent.keyboard("{Escape}");
    expect(document.querySelector<HTMLElement>('[data-slot="color-picker-dialog"]')?.style.display).toBe("none");
    await expect.element(screen.getByTestId("picker-hex")).toHaveTextContent("#c8cdef");
  });

  it("localizes notification-region and dismiss-button names through official Sonner props", async () => {
    const screen = await render(Harness, {});
    await screen.getByRole("button", { name: "Notify", exact: true }).click();
    await expect.element(page.getByRole("region", { name: /^Powiadomienia/ })).toBeInTheDocument();
    await expect.element(page.getByRole("button", { name: "Zamknij powiadomienie", exact: true })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Język panelu" }), "en");
    await expect.element(page.getByRole("region", { name: /^Notifications/ })).toBeInTheDocument();
    await expect.element(page.getByRole("button", { name: "Close toast", exact: true })).toBeInTheDocument();
  });
});

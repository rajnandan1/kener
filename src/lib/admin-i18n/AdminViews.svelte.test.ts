import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { commands, page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import Harness from "./AdminViews.harness.svelte";

declare module "vitest/browser" {
  interface BrowserCommands {
    mockBadgeImages: () => Promise<void>;
    restoreBadgeImages: () => Promise<void>;
  }
}

const requests: Array<{ action: string; data?: Record<string, unknown> }> = [];

beforeEach(() => {
  requests.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, options?: RequestInit) => {
      const body = JSON.parse(options?.body as string);
      requests.push(body);
      let result: unknown;
      switch (body.action) {
        case "getAllSiteData":
          result = {
            i18n: {
              defaultLocale: "pl",
              locales: [
                { code: "pl", selected: true },
                { code: "en", selected: true },
              ],
            },
            dateAndTimeFormat: { datePlusTime: "PPp", dateOnly: "PP", timeOnly: "HH:mm" },
            "test.provider": { isEnabled: false, requirements: {} },
          };
          break;
        case "getMonitors":
          result = [{ id: 1, tag: "safe-tag", name: "Save", status: "ACTIVE" }];
          break;
        case "getAllAlertsPaginated":
          result = { alerts: [], total: 0 };
          break;
        case "getMonitorAlertConfigById":
          result = {};
          break;
        case "getOidcSettingsMasked":
          result = { enabled: true, default_role_id: "member" };
          break;
        case "getOidcGroupRoleMappings":
          result = [];
          break;
        case "getRoles":
          result = [
            { id: "member", role_name: "Member", readonly: 1, status: "ACTIVE" },
            { id: "custom-member", role_name: "Member", readonly: 0, status: "ACTIVE" },
          ];
          break;
        default:
          throw new Error("Unexpected test action: " + body.action);
      }
      return { ok: true, json: async () => result } as Response;
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "kener_admin_locale=; Path=/; Max-Age=0";
});

describe("administrative language review regressions", () => {
  describe("badge previews", () => {
    beforeEach(async () => {
      await commands.mockBadgeImages();
    });

    afterEach(async () => {
      await commands.restoreBadgeImages();
    });

    it.each([
      ["status", "Stan", "Status"],
      ["uptime", "Dostępność", "Uptime"],
      ["latency", "Opóźnienie", "Latency"],
    ] as const)(
      "keeps the %s badge path technical while localizing labels and generated alt text",
      async (type, polishLabel, englishLabel) => {
        const screen = await render(Harness, { view: "badges" });
        await expect.element(screen.getByLabelText("Adres URL odznaki", { exact: true })).toBeInTheDocument();
        if (type !== "status") {
          await screen.getByLabelText("Typ odznaki", { exact: true }).click();
          await page.getByRole("option", { name: polishLabel, exact: true }).click();
        }
        await expect.element(screen.getByLabelText("Typ odznaki", { exact: true })).toHaveTextContent(polishLabel);
        const expectLoadedPreview = async (name: string) => {
          const preview = screen.getByRole("img", { name, exact: true });
          await expect.element(preview).toHaveAttribute("src", expect.stringContaining("/badge/_/" + type));
          await vi.waitFor(() => {
            const image = preview.element() as HTMLImageElement;
            expect(image.complete).toBe(true);
            expect(image.naturalWidth).toBeGreaterThan(0);
          });
        };
        const path = () => new URL((document.querySelector("#badge-url") as HTMLInputElement).value).pathname;
        await vi.waitFor(() => expect(path()).toBe("/badge/_/" + type));
        await expect
          .element(screen.getByLabelText("HTML", { exact: true }))
          .toHaveValue(expect.stringContaining('alt="' + polishLabel + '"'));
        await expectLoadedPreview("Podgląd odznaki");
        await userEvent.selectOptions(screen.getByRole("combobox", { name: "Język panelu" }), "en");
        await expect.element(screen.getByLabelText("Badge Type", { exact: true })).toHaveTextContent(englishLabel);
        expect(path()).toBe("/badge/_/" + type);
        await expect
          .element(screen.getByLabelText("HTML", { exact: true }))
          .toHaveValue(expect.stringContaining('alt="' + englishLabel + '"'));
        await expectLoadedPreview("Badge preview");
        await userEvent.selectOptions(screen.getByRole("combobox", { name: "Panel language" }), "pl");
        await expect.element(screen.getByLabelText("Typ odznaki", { exact: true })).toHaveTextContent(polishLabel);
        expect(path()).toBe("/badge/_/" + type);
        await expectLoadedPreview("Podgląd odznaki");
      },
    );
  });

  it("uses the selected public language for date previews, independently of the panel language", async () => {
    const screen = await render(Harness, { view: "internationalization" });
    const plMonth = new Intl.DateTimeFormat("pl", { month: "long" }).format(new Date());
    const enMonth = new Intl.DateTimeFormat("en", { month: "long" }).format(new Date());
    await expect.element(screen.getByLabelText("Domyślny język", { exact: true })).toHaveTextContent("polski");
    await expect
      .element(screen.getByRole("checkbox", { name: "duński", exact: true }))
      .toHaveAttribute("id", "locale-dk");
    await screen.getByLabelText("Tylko data", { exact: true }).fill("LLLL");
    await expect.element(screen.getByText("Podgląd: " + plMonth, { exact: true })).toBeInTheDocument();
    await screen.getByLabelText("Domyślny język", { exact: true }).click();
    await page.getByRole("option", { name: "angielski", exact: true }).click();
    await expect.element(screen.getByText("Podgląd: " + enMonth, { exact: true })).toBeInTheDocument();
    await expect.element(screen.getByRole("button", { name: "Zapisz języki", exact: true })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Język panelu" }), "en");
    await screen.getByLabelText("Default Language", { exact: true }).click();
    await page.getByRole("option", { name: "Polish", exact: true }).click();
    await expect.element(screen.getByText("Preview: " + plMonth, { exact: true })).toBeInTheDocument();
    expect(requests.every((request) => request.action !== "storeSiteData")).toBe(true);
  });

  it("localizes both empty alert-log branches and keeps filter values unchanged in requests", async () => {
    const screen = await render(Harness, { view: "alert-logs" });
    await expect.element(screen.getByText("Ten alert nie został jeszcze wyzwolony.")).toBeInTheDocument();
    const filter = screen.getByRole("button", { name: "Filtruj alerty według stanu", exact: true });
    await expect.element(filter).toHaveTextContent("Wszystkie stany");
    await filter.click();
    await page.getByRole("option", { name: "Wyzwolony", exact: true }).click();
    await expect.element(screen.getByText("Nie znaleziono wyzwolonych alertów.")).toBeInTheDocument();
    await expect.element(filter).toHaveTextContent("Wyzwolony");
    await filter.click();
    await page.getByRole("option", { name: "Rozwiązany", exact: true }).click();
    await expect.element(screen.getByText("Nie znaleziono rozwiązanych alertów.")).toBeInTheDocument();
    await expect.element(filter).toHaveTextContent("Rozwiązany");
    expect(
      requests.filter((request) => request.action === "getAllAlertsPaginated").map((request) => request.data?.status),
    ).toEqual(["ALL", "TRIGGERED", "RESOLVED"]);
  });

  it("translates readonly role names in OIDC while retaining an identically named custom role", async () => {
    const screen = await render(Harness, { view: "oidc" });
    const selector = screen.getByLabelText("Domyślna rola", { exact: true });
    await expect.element(selector).toHaveTextContent("Użytkownik");
    await selector.click();
    await expect.element(page.getByRole("option", { name: "Użytkownik", exact: true })).toBeInTheDocument();
    await page.getByRole("option", { name: "Member", exact: true }).click();
    await expect.element(selector).toHaveTextContent("Member");
    expect(requests.every((request) => request.action !== "storeSiteData")).toBe(true);
  });

  it("displays state adjectives rather than action verbs in provider settings", async () => {
    const screen = await render(Harness, { view: "provider" });
    const selector = screen.getByLabelText("Stan", { exact: true });
    await expect.element(selector).toHaveTextContent("Wyłączony");
    await selector.click();
    await page.getByRole("option", { name: "Włączony", exact: true }).click();
    await expect.element(selector).toHaveTextContent("Włączony");
    expect(requests.every((request) => request.action !== "storeSiteData")).toBe(true);
  });

  it("localizes confirmation instructions without changing technical phrases or user content", async () => {
    const screen = await render(Harness, { view: "danger" });
    const input = screen.getByLabelText("Aby potwierdzić, wpisz delete Save", { exact: true });
    const remove = screen.getByRole("button", { name: "Usuń monitor", exact: true });
    await expect.element(remove).toBeDisabled();
    await input.fill("delete Zapisz");
    await expect.element(remove).toBeDisabled();
    await input.fill("delete Save");
    await expect.element(remove).toBeEnabled();
    expect(requests).toHaveLength(0);
  });
});

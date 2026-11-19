import type { BrowserCommand, BrowserCommandContext } from "vitest/node";

type BadgeImageRoute = {
  matches: (url: URL) => boolean;
  handler: Parameters<BrowserCommandContext["page"]["route"]>[1];
};

const badgeImageRoutes = new WeakMap<BrowserCommandContext["page"], BadgeImageRoute>();
const badgeImageSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="20"><rect width="120" height="20" fill="#16a34a"/></svg>';

const mockBadgeImages: BrowserCommand<[], void> = async ({ provider, page, frame }) => {
  if (provider.name !== "playwright") {
    throw new Error("Badge image fixtures require the Playwright browser provider");
  }
  if (badgeImageRoutes.has(page)) {
    throw new Error("Badge image fixtures are already installed for this page");
  }

  const origin = new URL((await frame()).url()).origin;
  const matches = (url: URL) => url.origin === origin && /^\/badge\/_\/(status|uptime|latency)$/.test(url.pathname);
  const handler: BadgeImageRoute["handler"] = async (route) => {
    const request = route.request();
    if (request.method() !== "GET" || request.resourceType() !== "image") {
      await route.fallback();
      return;
    }
    await route.fulfill({ status: 200, contentType: "image/svg+xml", body: badgeImageSvg });
  };

  // Component tests exercise badge URLs and UI, not the SvelteKit image endpoint.
  await page.route(matches, handler);
  badgeImageRoutes.set(page, { matches, handler });
};

const restoreBadgeImages: BrowserCommand<[], void> = async ({ provider, page }) => {
  if (provider.name !== "playwright") {
    throw new Error("Badge image fixtures require the Playwright browser provider");
  }
  const route = badgeImageRoutes.get(page);
  if (route) {
    await page.unroute(route.matches, route.handler);
    badgeImageRoutes.delete(page);
  }
};

export const browserTestCommands = { mockBadgeImages, restoreBadgeImages };

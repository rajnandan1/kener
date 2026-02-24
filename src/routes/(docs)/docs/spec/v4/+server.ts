// routes/+server.ts
import { ScalarApiReference } from "@scalar/sveltekit";
import type { RequestHandler } from "./$types";
import { asset } from "$app/paths";

const render = ScalarApiReference({
  url: asset("/docs/spec/v4/spec.json"),
  hideModels: true,
  hideTestRequestButton: false,
  theme: "kepler",
  darkMode: true,
  layout: "modern",
  persistAuth: true,
  hideClientButton: true,
  proxyUrl: "https://proxy.scalar.com",
  customCss: `
    section.introduction-section {
      background-image: url("https://kener.ing/logo96.png");
      background-repeat: no-repeat;
      background-position: left 0px top 20px;
      background-size: 48px 48px;
    }
  `,
  metaData: {
    title: "Kener API Reference",
    description: "Kener free open source status page API Reference",
    ogDescription: "Kener free open source status page API Reference",
    ogTitle: "Kener API Reference",
    ogImage: "https://kener.ing/og.jpg",

    twitterCard: "summary_large_image",
    twitterTitle: "Kener API Reference",
    twitterDescription: "Kener free open source status page API Reference",
    twitterImage: "https://kener.ing/og.jpg",
  },
  favicon: "https://kener.ing/logo96.png",
});
export const GET: RequestHandler = () => {
  return render();
};

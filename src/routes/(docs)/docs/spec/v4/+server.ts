// routes/+server.ts
import { ScalarApiReference } from "@scalar/sveltekit";
import type { RequestHandler } from "./$types";
import { asset } from "$app/paths";

const render = ScalarApiReference({
  url: asset("/api-references/v4.json"),
  hideModels: true,
  hideTestRequestButton: true,
  darkMode: true,
  metaData: {
    title: "Kener API Reference",
    description: "Kener free open source status page API Reference",
    ogDescription: "Kener free open source status page API Reference",
    ogTitle: "Kener API Reference",
    ogImage: "https://kener.ing/newbg.png",
    twitterCard: "summary_large_image",
    twitterTitle: "Kener API Reference",
    twitterDescription: "Kener free open source status page API Reference",
    twitterImage: "https://kener.ing/newbg.png",
  },
  favicon: "https://kener.ing/logo96.png",
});
export const GET: RequestHandler = () => {
  return render();
};

import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import version from "vite-plugin-package-version";
import { defineConfig } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";

import * as dotenv from "dotenv";

dotenv.config();

function getAllowedHost(origin: string): string | undefined {
  try {
    return new URL(origin).hostname;
  } catch {
    return undefined;
  }
}

export default defineConfig(({ mode }) => {
  const port = Number(process.env.PORT) || 3000;
  const basePath = (process.env.KENER_BASE_PATH ?? "").trim();
  const viteBase = basePath === "" ? undefined : basePath.endsWith("/") ? basePath : `${basePath}/`;

  const buildEnv = process.env.VITE_BUILD_ENV || mode || "development";
  const isProduction = buildEnv === "production";

  const origin = process.env.ORIGIN || `http://localhost:${port}`;
  const allowedHost = getAllowedHost(origin);

  return {
    base: viteBase,
    optimizeDeps: {
      include: ["rrule"],
      exclude: [
        "svelte-codemirror-editor",
        "codemirror",
        "@codemirror/lang-javascript",
        "@codemirror/lang-json",
        "@codemirror/lang-markdown",
        "@codemirror/lang-css",
        "@codemirror/lang-html",
        "@uiw/codemirror-theme-github",
      ],
    },
    plugins: [tailwindcss(), sveltekit(), version(), devtoolsJson()],
    server: {
      allowedHosts: allowedHost ? [allowedHost] : undefined,
      port,
      watch: {
        ignored: ["**/src/lib/server/data/**"],
      },
    },
    assetsInclude: ["**/*.yaml"],
    ssr: {
      noExternal: ["svelte-sonner", "svelte-codemirror-editor", "rrule"],
    },
    // Keeping this around for quick grepping/debugging.
    define: {
      __KENER_BUILD_ENV__: JSON.stringify(buildEnv),
      __KENER_IS_PROD__: JSON.stringify(isProduction),
    },
  };
});

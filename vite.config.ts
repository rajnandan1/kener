/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import version from "vite-plugin-package-version";
import { defineConfig, type Plugin } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";
import { playwright } from "@vitest/browser-playwright";
import { configDefaults } from "vitest/config";

import * as dotenv from "dotenv";

dotenv.config();

function getAllowedHost(origin: string): string | undefined {
  try {
    return new URL(origin).hostname;
  } catch {
    return undefined;
  }
}

// vite-plugin-svelte serves a component's <style> from the module graph entry of the bare .svelte path. In dev,
// Vite adds ?v=<hash> to the files of a package in optimizeDeps.exclude, so for svelte-codemirror-editor that
// entry is CodeMirror.svelte?v=<hash>: the bare-path lookup misses, Vite falls back to the raw .svelte source,
// and @tailwindcss/vite fails on it ("Invalid declaration: `<script lang="ts" module>"). This serves the CSS
// from the versioned entry. Production builds add no version query, so it runs in dev only.
function svelteVersionedDepCss(): Plugin {
  return {
    name: "kener:svelte-versioned-dep-css",
    apply: "serve",
    enforce: "pre",
    load(id) {
      if (!id.includes("/node_modules/") || !/[?&]svelte&type=style&lang\.css$/.test(id)) return;
      const filename = id.slice(0, id.indexOf("?"));
      const cssOf = (moduleId: string) => this.getModuleInfo(moduleId)?.meta?.svelte?.css;
      if (cssOf(filename)) return; // vite-plugin-svelte finds it
      for (const moduleId of this.getModuleIds()) {
        if (!moduleId.startsWith(`${filename}?v=`)) continue;
        const css = cssOf(moduleId);
        if (css) return { code: css.code, map: css.map };
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const port = Number(process.env.PORT) || 3000;

  const buildEnv = process.env.VITE_BUILD_ENV || mode || "development";
  const isProduction = buildEnv === "production";

  const origin = process.env.ORIGIN || `http://localhost:${port}`;
  const allowedHost = getAllowedHost(origin);

  return {
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
    plugins: [svelteVersionedDepCss(), tailwindcss(), sveltekit(), version(), devtoolsJson()],
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
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: "server",
            environment: "node",
            env: { KENER_SECRET_KEY: "kener-test-secret" },
            include: ["src/**/*.{test,spec}.{js,ts}"],
            exclude: [...configDefaults.exclude, "src/**/*.svelte.{test,spec}.{js,ts}"],
          },
        },
        {
          extends: true,
          // Pre-bundle the component-test dependency graph: on a cold Vite cache
          // (every CI runner) a mid-run dep-optimization reload can flake the suite.
          optimizeDeps: {
            include: ["layerchart", "mode-watcher", "bits-ui", "d3-scale", "d3-shape"],
          },
          test: {
            name: "client",
            browser: {
              enabled: true,
              headless: true,
              provider: playwright({ contextOptions: { timezoneId: "UTC" } }),
              instances: [{ browser: "chromium" }],
              // Vitest's default browser API port (63315) can fall inside Windows
              // Hyper-V excluded TCP port ranges; pin below the ephemeral range.
              api: { port: 5180 },
            },
            include: ["src/**/*.svelte.{test,spec}.{js,ts}"],
            setupFiles: ["./vitest-setup-client.ts"],
          },
        },
      ],
    },
  };
});

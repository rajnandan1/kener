// @ts-nocheck
import dotenv from "dotenv";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import version from "vite-plugin-package-version";

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const base = process.env.KENER_BASE_PATH || "";
const VITE_BUILD_ENV = process.env.VITE_BUILD_ENV || "development"; // Default to "development"
const isProduction = VITE_BUILD_ENV === "production";

export default defineConfig(({ mode }) => ({
  optimizeDeps: {
    exclude: [
      "svelte-codemirror-editor",
      "codemirror",
      "@codemirror/language-javascript",
      "@uiw/codemirror-theme-github",
      "@codemirror/language-json",
      "@codemirror/language-markdown",
      "@codemirror/language-css",
      "@codemirror/language-html",
    ],
  },
  plugins: [
    sveltekit({
      compilerOptions: {
        dev: mode === "development",
      },
      onwarn: (warning, handler) => {
        // Suppress specific warnings in production
        const ignoredWarnings = [
          "a11y-", // Accessibility warnings
          "unused-export-let", // Suppresses "unused export property" warnings
          "empty-chunk", // Suppresses empty chunk warnings
          "module-unused-import", // Suppresses unused imports like "default" from auto-animate
          "conflicting-svelte-resolve", // Suppresses conflicting resolve warnings
        ];

        if (isProduction && ignoredWarnings.some((w) => warning.code && warning.code.startsWith(w))) {
          return; // Ignore these warnings in production builds
        }

        handler(warning);
      },
    }),
    version(),
  ],
  server: {
    port: PORT,
    watch: {
      ignored: ["**/src/lib/server/data/**"], // Adjust the path to the file you want to ignore
    },
  },
  assetsInclude: ["**/*.yaml"],
}));

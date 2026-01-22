import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import * as dotenv from "dotenv";

dotenv.config();

const basePath = process.env.KENER_BASE_PATH ? process.env.KENER_BASE_PATH : "";
const buildEnv = process.env.VITE_BUILD_ENV || process.env.NODE_ENV || "development";
const isProduction = buildEnv === "production";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: [vitePreprocess({})],

  kit: {
    adapter: adapter(),
    paths: {
      base: basePath,
    },
  },

  compilerOptions: {
    dev: !isProduction,
    sourcemap: !isProduction,
  },

  onwarn: (warning, handler) => {
    // Suppress specific warnings in production
    const ignoredWarnings = [
      "a11y-",
      "unused-export-let",
      "empty-chunk",
      "module-unused-import",
      "conflicting-svelte-resolve",
    ];

    if (isProduction && warning.code && ignoredWarnings.some((w) => warning.code.startsWith(w))) {
      return;
    }

    handler(warning);
  },
};

export default config;

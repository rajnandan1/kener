import { vitePreprocess } from "@sveltejs/kit/vite";
import adapter from "@sveltejs/adapter-node";

const basePath = !!process.env.KENER_BASE_PATH ? process.env.KENER_BASE_PATH : "";
const VITE_BUILD_ENV = process.env.VITE_BUILD_ENV || "development"; // Default to "development"
const isProduction = VITE_BUILD_ENV === "production";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter(),
    paths: {
      base: basePath,
    },
  },
  preprocess: [vitePreprocess({})],

  compilerOptions: {
    dev: !isProduction, // Disable dev mode in production
    enableSourcemap: !isProduction, // Disable sourcemaps in production
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

    handler(warning); // Otherwise, show the warning
  },
};

export default config;

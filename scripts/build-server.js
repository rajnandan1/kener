import * as esbuild from "esbuild";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf8"));

// Collect all dependency names to externalize, except CJS packages
// that need to be bundled for ESM compatibility
const CJS_PACKAGES_TO_BUNDLE = ["rrule"];

const externalDeps = [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})].filter(
  (dep) => !CJS_PACKAGES_TO_BUNDLE.includes(dep),
);

await esbuild.build({
  entryPoints: ["scripts/main.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: "build/main.js",
  // Externalize all node_modules except CJS packages that break ESM named imports
  external: externalDeps,
  alias: {
    // Map SvelteKit's $lib alias so server code resolves correctly
    $lib: "./src/lib",
  },
  define: {
    // Inject version at build time so src/lib/version.ts resolves it
    // without relying on vite-plugin-package-version at runtime
    "import.meta.env.PACKAGE_VERSION": JSON.stringify(pkg.version),
  },
  plugins: [
    {
      name: "rewrite-build-imports",
      setup(build) {
        // Since the output lives in build/, rewrite ../build/X → ./X
        // so that handler.js (SvelteKit output) resolves correctly
        build.onResolve({ filter: /^\.\.\/build\// }, (args) => {
          return {
            path: args.path.replace(/^\.\.\/build\//, "./"),
            external: true,
          };
        });
      },
    },
  ],
  banner: {
    js: "// Kener production server – built with esbuild",
  },
});

console.log(`Server build completed: build/main.js (v${pkg.version})`);

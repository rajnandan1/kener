/**
 * SvelteKit build script that optionally excludes docs routes.
 *
 * Usage:
 *   node scripts/build-sveltekit.js              # build WITHOUT docs
 *   node scripts/build-sveltekit.js --with-docs   # build WITH docs
 */
import { execSync } from "child_process";
import { renameSync, existsSync, rmSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

const withDocs = process.argv.includes("--with-docs");

const docsDir = resolve(rootDir, "src/routes/(docs)");
const docsHiddenDir = resolve(rootDir, ".docs-excluded");

function moveDocs(from, to) {
  if (existsSync(from)) {
    renameSync(from, to);
  }
}

function build() {
  if (!withDocs) {
    console.log("[build] Excluding docs routes from build...");
    moveDocs(docsDir, docsHiddenDir);
    // Clean generated route types so stale docs routes don't persist
    const svelteKitDir = resolve(rootDir, ".svelte-kit");
    if (existsSync(svelteKitDir)) {
      rmSync(svelteKitDir, { recursive: true, force: true });
    }
  } else {
    console.log("[build] Including docs routes in build...");
  }

  try {
    execSync("npx vite build", { cwd: rootDir, stdio: "inherit" });
  } finally {
    // Always restore docs folder, even if build fails
    if (!withDocs) {
      moveDocs(docsHiddenDir, docsDir);
      console.log("[build] Restored docs routes.");
    }
  }
}

build();

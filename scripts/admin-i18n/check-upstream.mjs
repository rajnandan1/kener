/** Read-only stable-release check; does not modify Git, dependencies or catalogues. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** @param {string} value */
function versionParts(value) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(value);
  if (!match) throw new Error(`Unsupported stable version: ${value}`);
  return match.slice(1).map(Number);
}
/** @param {string} left @param {string} right */
function newer(left, right) {
  const a = versionParts(left),
    b = versionParts(right);
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}
/** @param {{ latest: string, local: string, reviewed: string }} versions */
export function releaseReviewStatus({ latest, local, reviewed }) {
  return {
    latest,
    local,
    reviewed,
    upstreamUpdateAvailable: newer(latest, local),
    translationReviewRequired: newer(latest, reviewed) || newer(local, reviewed),
  };
}
/** @param {{ request?: typeof fetch, root?: string }} [options] */
export async function checkUpstream({
  request = fetch,
  root = fileURLToPath(new URL("../../", import.meta.url)),
} = {}) {
  const response = await request("https://api.github.com/repos/rajnandan1/kener/releases/latest", {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "kener-panel-localization-release-check" },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`GitHub release check failed: HTTP ${response.status}`);
  const release = await response.json();
  if (release.draft || release.prerelease) throw new Error("Expected a stable published Kener release");
  const local = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
  const reviewed = JSON.parse(fs.readFileSync(path.join(root, "scripts/admin-i18n/source-inventory.json"), "utf8"))
    .upstream.version;
  return {
    ...releaseReviewStatus({ latest: release.tag_name, local, reviewed }),
    releaseUrl: release.html_url,
    publishedAt: release.published_at,
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(JSON.stringify(await checkUpstream(), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

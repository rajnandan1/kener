import { buildSync } from "esbuild";

export function buildCheerioGuest() {
  const { outputFiles } = buildSync({
    stdin: { contents: 'export * from "cheerio";', resolveDir: process.cwd() },
    bundle: true,
    format: "iife",
    globalName: "__cheerio",
    platform: "browser",
    minify: true,
    legalComments: "none",
    write: false,
  });
  return outputFiles[0].text;
}

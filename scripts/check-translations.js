//node scripts/check-translations.js

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { globSync } from "glob";
import yaml from "js-yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const srcDir = path.join(projectRoot, "src");
const localesDir = path.join(srcDir, "lib", "locales");

const SUPPORTED_FORMATS = new Set(["json", "yaml"]);

const SOURCE_GLOBS = ["src/**/*.{svelte,ts,js,mts,cts}", "!src/lib/locales/**/*.json", "!src/**/*.d.ts"];

const TRANSLATION_CALL_REGEX = /\$t\s*\(\s*(["'`])([\s\S]*?)\1\s*(?:,|\))/g;

const COMMENT_PATTERNS = [/\/\*[\s\S]*?\*\//g, /\/\/[^\n\r]*/g, /<!--[\s\S]*?-->/g];

function decodeQuotedContent(value) {
  return value
    .replace(/\\\\/g, "\\")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\`/g, "`");
}

function getLineNumber(text, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (text[i] === "\n") {
      line += 1;
    }
  }
  return line;
}

function maskComments(content) {
  let result = content;
  for (const pattern of COMMENT_PATTERNS) {
    result = result.replace(pattern, (match) => match.replace(/[^\n]/g, " "));
  }
  return result;
}

function getUsedTranslationKeys() {
  const files = globSync(SOURCE_GLOBS, {
    cwd: projectRoot,
    nodir: true,
    ignore: ["**/node_modules/**", "**/.svelte-kit/**", "**/build/**", "**/dist/**"],
  });

  const usedKeys = new Set();
  const skippedDynamicCalls = [];

  for (const relativePath of files) {
    const absolutePath = path.join(projectRoot, relativePath);
    const content = fs.readFileSync(absolutePath, "utf8");
    const searchable = maskComments(content);
    TRANSLATION_CALL_REGEX.lastIndex = 0;

    for (const match of searchable.matchAll(TRANSLATION_CALL_REGEX)) {
      const quote = match[1];
      const rawKey = match[2].trim();
      if (!rawKey) {
        continue;
      }

      if (quote === "`" && rawKey.includes("${")) {
        skippedDynamicCalls.push({
          file: relativePath,
          line: getLineNumber(searchable, match.index ?? 0),
          reason: "template literal contains interpolation",
        });
        continue;
      }

      usedKeys.add(decodeQuotedContent(rawKey));
    }
  }

  return {
    usedKeys,
    skippedDynamicCalls,
  };
}

function readLocaleMappings() {
  const localeFiles = globSync("*.json", {
    cwd: localesDir,
    nodir: true,
  });

  const localeMap = new Map();

  for (const fileName of localeFiles) {
    const fullPath = path.join(localesDir, fileName);
    const raw = fs.readFileSync(fullPath, "utf8");
    const json = JSON.parse(raw);

    if (!json || typeof json !== "object" || typeof json.mappings !== "object") {
      throw new Error(`Invalid locale file format in ${fileName}: expected { mappings: {...} }`);
    }

    localeMap.set(fileName, new Set(Object.keys(json.mappings)));
  }

  return localeMap;
}

function parseArgs(argv) {
  let format = "json";

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--format") {
      format = (argv[i + 1] || "").toLowerCase();
      i += 1;
      continue;
    }

    if (arg.startsWith("--format=")) {
      format = arg.split("=")[1].toLowerCase();
    }
  }

  if (!SUPPORTED_FORMATS.has(format)) {
    throw new Error(`Unsupported format: ${format}. Use --format json or --format yaml.`);
  }

  return {
    format,
    outputFile: path.join(projectRoot, `translation-report.${format === "yaml" ? "yaml" : "json"}`),
  };
}

function main() {
  const { format, outputFile } = parseArgs(process.argv.slice(2));
  const { usedKeys, skippedDynamicCalls } = getUsedTranslationKeys();
  const locales = readLocaleMappings();

  const sortedUsedKeys = [...usedKeys].sort((a, b) => a.localeCompare(b));
  const localeFiles = [...locales.keys()].sort((a, b) => a.localeCompare(b));

  const localesReport = {};

  for (const localeFile of localeFiles) {
    const localeKeys = locales.get(localeFile) ?? new Set();

    const missing = sortedUsedKeys.filter((key) => !localeKeys.has(key));
    const unused = [...localeKeys].filter((key) => !usedKeys.has(key)).sort((a, b) => a.localeCompare(b));

    localesReport[localeFile] = {
      missing,
      unused,
      missingCount: missing.length,
      unusedCount: unused.length,
    };
  }

  const report = {
    generatedAt: new Date().toISOString(),
    format,
    scannedSourceDir: "src",
    usedLiteralKeysCount: sortedUsedKeys.length,
    usedLiteralKeys: sortedUsedKeys,
    localeFilesCount: localeFiles.length,
    locales: localesReport,
    skippedDynamicCallsCount: skippedDynamicCalls.length,
    skippedDynamicCalls,
  };

  if (format === "yaml") {
    fs.writeFileSync(outputFile, yaml.dump(report, { noRefs: true }) + "\n", "utf8");
  } else {
    fs.writeFileSync(outputFile, JSON.stringify(report, null, 2) + "\n", "utf8");
  }

  console.log(`Translation report written to: ${outputFile}`);
}

try {
  main();
} catch (error) {
  console.error("Failed to check translations.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

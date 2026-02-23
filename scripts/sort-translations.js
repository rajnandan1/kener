import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { globSync } from "glob";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const localesDir = path.join(projectRoot, "src", "lib", "locales");

function fail(message) {
  throw new Error(message);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sortObjectKeysAscending(input) {
  const keys = Object.keys(input).sort((a, b) => a.localeCompare(b));
  const result = {};
  for (const key of keys) {
    result[key] = input[key];
  }
  return result;
}

function replaceMappingsPreserveTopLevelOrder(localeData, sortedMappings) {
  const next = {};
  let sawMappings = false;

  for (const key of Object.keys(localeData)) {
    if (key === "mappings") {
      next[key] = sortedMappings;
      sawMappings = true;
    } else {
      next[key] = localeData[key];
    }
  }

  if (!sawMappings) {
    next.mappings = sortedMappings;
  }

  return next;
}

function loadLocaleJson(localePath, localeFileName) {
  const raw = fs.readFileSync(localePath, "utf8");

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    fail(`Invalid JSON in ${localeFileName}: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!isPlainObject(parsed)) {
    fail(`Invalid locale file ${localeFileName}: expected a top-level object.`);
  }

  if (!isPlainObject(parsed.mappings)) {
    fail(`Invalid locale file ${localeFileName}: expected "mappings" to be an object.`);
  }

  return parsed;
}

function sortTranslations() {
  if (!fs.existsSync(localesDir)) {
    fail(`Locales directory not found: ${localesDir}`);
  }

  const localeFiles = globSync("*.json", {
    cwd: localesDir,
    nodir: true,
  }).sort((a, b) => a.localeCompare(b));

  if (localeFiles.length === 0) {
    fail(`No locale files found in ${localesDir}`);
  }

  let changedFilesCount = 0;

  for (const localeFileName of localeFiles) {
    const localePath = path.join(localesDir, localeFileName);
    const localeData = loadLocaleJson(localePath, localeFileName);

    const sortedMappings = sortObjectKeysAscending(localeData.mappings);
    const nextLocaleData = replaceMappingsPreserveTopLevelOrder(localeData, sortedMappings);

    const nextContent = `${JSON.stringify(nextLocaleData, null, 2)}\n`;
    const currentContent = fs.readFileSync(localePath, "utf8");

    if (nextContent !== currentContent) {
      fs.writeFileSync(localePath, nextContent, "utf8");
      changedFilesCount += 1;
      console.log(`${localeFileName}: sorted mappings in ascending key order`);
    } else {
      console.log(`${localeFileName}: already sorted`);
    }
  }

  console.log(`Done. Updated ${changedFilesCount} file${changedFilesCount === 1 ? "" : "s"}.`);
}

try {
  sortTranslations();
} catch (error) {
  console.error("Failed to sort translations.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { globSync } from "glob";
import yaml from "js-yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const localesDir = path.join(projectRoot, "src", "lib", "locales");

const WHITELISTED_DYNAMIC_KEYS = new Set([
  "All Systems Operational",
  "Degraded Performance",
  "Partial Degraded Performance",
  "Partial System Outage",
  "Major System Outage",
  "No Status Available",
]);

function fail(message) {
  throw new Error(message);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseArgs(argv) {
  let reportPath;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--report") {
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        fail("Missing value for --report. Usage: --report <path>");
      }
      reportPath = next;
      i += 1;
      continue;
    }

    if (arg.startsWith("--report=")) {
      reportPath = arg.slice("--report=".length);
      if (!reportPath) {
        fail("Missing value for --report. Usage: --report <path>");
      }
      continue;
    }

    fail(`Unknown argument: ${arg}`);
  }

  return { reportPath };
}

function detectReportPath(overridePath) {
  if (overridePath) {
    const resolved = path.resolve(projectRoot, overridePath);
    if (!fs.existsSync(resolved)) {
      fail(`Report file not found: ${resolved}`);
    }
    return resolved;
  }

  const jsonPath = path.join(projectRoot, "translation-report.json");
  const yamlPath = path.join(projectRoot, "translation-report.yaml");

  if (fs.existsSync(jsonPath)) return jsonPath;
  if (fs.existsSync(yamlPath)) return yamlPath;

  fail(
    "Could not find translation report. Expected translation-report.json or translation-report.yaml in project root, or use --report <path>.",
  );
}

function loadReport(reportPath) {
  const ext = path.extname(reportPath).toLowerCase();
  const raw = fs.readFileSync(reportPath, "utf8");

  let parsed;
  try {
    if (ext === ".json") {
      parsed = JSON.parse(raw);
    } else if (ext === ".yaml" || ext === ".yml") {
      parsed = yaml.load(raw);
    } else {
      fail(`Unsupported report file extension: ${ext}. Use .json, .yaml, or .yml.`);
    }
  } catch (error) {
    fail(`Failed to parse report at ${reportPath}: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!isPlainObject(parsed)) {
    fail("Invalid report format: expected a top-level object.");
  }

  if (!isPlainObject(parsed.locales)) {
    fail("Invalid report format: expected report.locales to be an object.");
  }

  return parsed;
}

function getUnusedKeysForLocale(report, localeFileName) {
  const localeReport = report.locales[localeFileName];

  if (localeReport === undefined) return [];

  if (!isPlainObject(localeReport)) {
    fail(`Invalid report format for locales.${localeFileName}: expected an object.`);
  }

  const { unused } = localeReport;

  if (unused === undefined) return [];

  if (!Array.isArray(unused)) {
    fail(`Invalid report format for locales.${localeFileName}.unused: expected an array.`);
  }

  const nonStrings = unused.filter((key) => typeof key !== "string");
  if (nonStrings.length > 0) {
    fail(`Invalid report format for locales.${localeFileName}.unused: all entries must be strings.`);
  }

  return unused;
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
    fail(`Invalid locale file ${localeFileName}: expected \"mappings\" to be an object.`);
  }

  return parsed;
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

function cleanTranslations(report) {
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

  let totalRemoved = 0;
  const perFile = [];

  for (const localeFileName of localeFiles) {
    const localePath = path.join(localesDir, localeFileName);
    const localeData = loadLocaleJson(localePath, localeFileName);
    const unusedKeys = getUnusedKeysForLocale(report, localeFileName);
    const unusedSet = new Set(unusedKeys.filter((key) => !WHITELISTED_DYNAMIC_KEYS.has(key)));

    const currentMappings = localeData.mappings;
    const cleanedMappings = {};

    let removedCount = 0;
    for (const [key, value] of Object.entries(currentMappings)) {
      if (unusedSet.has(key)) {
        removedCount += 1;
      } else {
        cleanedMappings[key] = value;
      }
    }

    const sortedMappings = sortObjectKeysAscending(cleanedMappings);
    const nextLocaleData = replaceMappingsPreserveTopLevelOrder(localeData, sortedMappings);

    fs.writeFileSync(localePath, `${JSON.stringify(nextLocaleData, null, 2)}\n`, "utf8");

    totalRemoved += removedCount;
    perFile.push({ file: localeFileName, removed: removedCount });
  }

  for (const item of perFile) {
    console.log(`${item.file}: removed ${item.removed} key${item.removed === 1 ? "" : "s"}`);
  }
  console.log(`Total removed: ${totalRemoved}`);
}

function main() {
  const { reportPath: reportArg } = parseArgs(process.argv.slice(2));
  const reportPath = detectReportPath(reportArg);
  const report = loadReport(reportPath);

  console.log(`Using report: ${path.relative(projectRoot, reportPath)}`);
  cleanTranslations(report);
}

try {
  main();
} catch (error) {
  console.error("Failed to clean translations.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

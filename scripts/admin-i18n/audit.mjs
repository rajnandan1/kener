/** Read-only translation audit. Does not rewrite application source or catalogues. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "svelte/compiler";
import { extractServerStrings } from "./extract-server-strings.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const english = JSON.parse(read("src/lib/admin-i18n/en.json"));
const polish = JSON.parse(read("src/lib/admin-i18n/pl.json"));
const baseline = JSON.parse(read("scripts/admin-i18n/source-inventory.json"));
const exceptions = JSON.parse(read("scripts/admin-i18n/technical-exceptions.json"));
const normalize = (value) => value.replace(/\s+/g, " ").trim();
const canonical = (value) => normalize(value).replace(/\{[a-zA-Z]\w*\}/g, "{}");
const tokens = (value) => [...value.matchAll(/\{([a-zA-Z]\w*)\}/g)].map((match) => match[1]).sort();
const known = new Set(Object.keys(english).map(canonical));
const findings = [];
const occurrences = [];
function record(text, file, kind, line) {
  text = normalize(text);
  if (/[A-Za-z]/.test(text)) occurrences.push({ text, file, kind, line });
}
function checkMessage(text, file, kind, line) {
  record(text, file, kind, line);
  if (!known.has(canonical(text))) findings.push({ kind: "missing-message", text, file, line });
}
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
function resolve(from, specifier) {
  const target = specifier.startsWith("$lib/")
    ? path.join(root, "src/lib", specifier.slice(5))
    : specifier.startsWith(".")
      ? path.resolve(path.dirname(from), specifier)
      : null;
  if (!target) return null;
  return [target, target.replace(/\.js$/, ".ts"), target + "/index.ts", target + "/index.js"].find(
    (candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
  );
}
const queue = ["src/routes/(manage)", "src/routes/(account)"]
  .flatMap((directory) => walk(path.join(root, directory)))
  .filter((file) => file.endsWith(".svelte"));
queue.push(path.join(root, "src/routes/+error.svelte"));
const visited = new Set();
const components = [];
while (queue.length) {
  const file = queue.pop();
  if (visited.has(file) || /\.(?:test|spec|harness)\./.test(file)) continue;
  visited.add(file);
  const source = fs.readFileSync(file, "utf8");
  if (file.endsWith(".svelte")) components.push(file);
  for (const match of source.matchAll(/(?:import|export)\s[\s\S]*?\sfrom\s*["']([^"']+)["']/g)) {
    const dependency = resolve(file, match[1]);
    if (dependency?.startsWith(path.join(root, "src/"))) queue.push(dependency);
  }
}
const uiProperties = new Set([
  "label",
  "title",
  "description",
  "placeholder",
  "help",
  "helpText",
  "tooltip",
  "subtitle",
  "message",
  "emptyMessage",
]);
const visibleAttributes = new Set([
  "title",
  "placeholder",
  "aria-label",
  "aria-description",
  "alt",
  "label",
  "description",
  "tooltip",
  "emptyMessage",
  "loadingText",
]);
function technical(text) {
  return (
    !/[A-Za-z]/.test(text) ||
    Object.hasOwn(exceptions, text) ||
    /^(?:https?:|\/|\$lib\/|@|#)/.test(text) ||
    /\.(?:svelte|js|ts)$/.test(text)
  );
}
function inspect(node, source, file, ancestors = []) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((child) => inspect(child, source, file, ancestors));
    return;
  }
  const line = () => source.slice(0, node.start).split("\n").length;
  const literal = (item) => item?.type === "Literal" && typeof item.value === "string";
  if (
    node.type === "CallExpression" &&
    node.callee?.type === "Identifier" &&
    node.callee.name === "$adminT" &&
    literal(node.arguments[0])
  ) {
    checkMessage(node.arguments[0].value, file, "translation-call", line());
  }
  if (
    node.type === "Property" &&
    uiProperties.has(node.key?.name ?? node.key?.value) &&
    literal(node.value) &&
    !technical(node.value.value)
  ) {
    checkMessage(node.value.value, file, "display-property", line());
  }
  const inMarkup = ancestors.some((parent) => parent.type === "Fragment");
  const inCode = ancestors.some((parent) => ["code", "pre", "script", "style"].includes(parent.name));
  if (node.type === "Text" && inMarkup && !inCode && !ancestors.some((parent) => parent.type === "Attribute")) {
    const value = normalize(node.data);
    if (!technical(value) && !["Polski", "English"].includes(value))
      findings.push({ kind: "unwrapped-text", text: value, file, line: line() });
  }
  if (
    node.type === "Attribute" &&
    visibleAttributes.has(node.name) &&
    Array.isArray(node.value) &&
    node.value.every((item) => item.type === "Text")
  ) {
    const value = normalize(node.value.map((item) => item.data).join(""));
    if (!technical(value)) findings.push({ kind: "unwrapped-attribute", text: value, file, line: line() });
  }
  for (const [key, value] of Object.entries(node)) {
    if (["loc", "metadata", "parent", "name_loc"].includes(key)) continue;
    if (value && typeof value === "object") inspect(value, source, file, [...ancestors, node]);
  }
}
for (const absolute of components) {
  const file = path.relative(root, absolute);
  const source = fs.readFileSync(absolute, "utf8");
  try {
    inspect(parse(source, { modern: true }), source, file);
  } catch (error) {
    findings.push({ kind: "parse-error", file, message: error.message });
  }
}
for (const row of extractServerStrings(root)) checkMessage(row.text, row.file, row.category, row.line);
for (const [text, origins] of Object.entries(baseline.messages)) {
  if (!known.has(canonical(text))) findings.push({ kind: "missing-baseline-message", text, origins });
  for (const origin of origins)
    if (origin.file && !fs.existsSync(path.join(root, origin.file)))
      findings.push({ kind: "stale-inventory-path", text, file: origin.file });
}
for (const key of new Set([...Object.keys(english), ...Object.keys(polish)])) {
  if (!english[key]?.trim() || !polish[key]?.trim()) findings.push({ kind: "empty-or-missing-translation", text: key });
  else if (JSON.stringify(tokens(english[key])) !== JSON.stringify(tokens(polish[key])))
    findings.push({ kind: "placeholder-mismatch", text: key });
  else if (english[key] === polish[key] && !Object.hasOwn(exceptions, key))
    findings.push({ kind: "unreviewed-identical-translation", text: key });
}
const version = JSON.parse(read("package.json")).version;
if (version !== baseline.upstream.version)
  findings.push({ kind: "upstream-version-changed", expected: baseline.upstream.version, actual: version });
const uniqueFindings = [...new Map(findings.map((item) => [JSON.stringify(item), item])).values()];
const report = {
  schemaVersion: 1,
  upstream: baseline.upstream,
  summary: {
    catalogueMessages: Object.keys(english).length,
    componentsScanned: components.length,
    sourceOccurrences: occurrences.length,
    findings: uniqueFindings.length,
  },
  findings: uniqueFindings,
  occurrences,
};
const reportIndex = process.argv.indexOf("--report");
if (reportIndex >= 0) {
  const output = process.argv[reportIndex + 1];
  if (!output) throw new Error("--report requires a file path");
  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
}
console.log(JSON.stringify({ summary: report.summary, findings: uniqueFindings }, null, 2));
if (uniqueFindings.length) process.exitCode = 1;

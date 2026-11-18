import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../../../scripts/admin-i18n/audit.mjs", import.meta.url));
const fixtures: string[] = [];
function fixture(key = "{days} Days") {
  const root = mkdtempSync(path.join(tmpdir(), "kener-panel-audit-"));
  fixtures.push(root);
  const files: Record<string, unknown> = {
    "package.json": { version: "4.2.2" },
    "src/lib/admin-i18n/en.json": {
      "{days} Days": "{days} Days",
      "Eval error: {diagnostic}": "Eval error: {diagnostic}",
    },
    "src/lib/admin-i18n/pl.json": { "{days} Days": "{days} dni", "Eval error: {diagnostic}": "Błąd: {diagnostic}" },
    "scripts/admin-i18n/source-inventory.json": { upstream: { version: "4.2.1" }, messages: {} },
    "scripts/admin-i18n/technical-exceptions.json": {},
  };
  for (const [name, value] of Object.entries(files)) {
    const full = path.join(root, name);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, JSON.stringify(value));
  }
  mkdirSync(path.join(root, "src/routes/(manage)"), { recursive: true });
  mkdirSync(path.join(root, "src/routes/(account)"), { recursive: true });
  writeFileSync(path.join(root, "src/lib/global-constants.ts"), "export default {};");
  writeFileSync(path.join(root, "src/routes/+error.svelte"), "<div></div>");
  writeFileSync(
    path.join(root, "src/routes/(manage)/fixture.svelte"),
    `{ $adminT(${JSON.stringify(key)}, { days: 30, count: 30 }) }`,
  );
  writeFileSync(path.join(root, "src/routes/(account)/diagnostic.ts"), "throw new Error(`Eval error: ${diagnostic}`);");
  return root;
}
function audit(root: string) {
  const result = spawnSync(process.execPath, [script, "--root", root], { encoding: "utf8" });
  expect(result.stderr).toBe("");
  expect(result.error).toBeUndefined();
  return { status: result.status, report: JSON.parse(result.stdout) };
}
afterEach(() => {
  for (const root of fixtures.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("panel translation audit", () => {
  it("keeps release changes advisory while accepting generated server placeholder names", () => {
    const { status, report } = audit(fixture());
    expect(status).toBe(0);
    expect(report.findings).toEqual([]);
    expect(report.warnings).toEqual([{ kind: "upstream-version-changed", reviewed: "4.2.1", current: "4.2.2" }]);
  });
  it("rejects a literal key whose placeholder name differs from the catalogue", () => {
    const { status, report } = audit(fixture("{count} Days"));
    expect(status).toBe(1);
    expect(report.findings).toContainEqual(expect.objectContaining({ kind: "missing-message", text: "{count} Days" }));
  });
  it("audits additional language files and rejects missing translations", () => {
    const root = fixture();
    writeFileSync(path.join(root, "src/lib/admin-i18n/fr.json"), JSON.stringify({ "{days} Days": "{days} jours" }));
    const { status, report } = audit(root);
    expect(status).toBe(1);
    expect(report.summary.languages).toEqual(["en", "fr", "pl"]);
    expect(report.findings).toContainEqual(
      expect.objectContaining({ kind: "empty-or-missing-translation", locale: "fr", text: "Eval error: {diagnostic}" }),
    );
  });
  it("reports placeholder mistakes in any additional language", () => {
    const root = fixture();
    writeFileSync(
      path.join(root, "src/lib/admin-i18n/fr.json"),
      JSON.stringify({ "{days} Days": "{count} jours", "Eval error: {diagnostic}": "Erreur: {diagnostic}" }),
    );
    const { status, report } = audit(root);
    expect(status).toBe(1);
    expect(report.findings).toContainEqual(
      expect.objectContaining({ kind: "placeholder-mismatch", locale: "fr", text: "{days} Days" }),
    );
  });
  it("limits reviewed identical wording to its registered language", () => {
    const root = fixture();
    const french = { "{days} Days": "{days} Days", "Eval error: {diagnostic}": "Erreur: {diagnostic}" };
    writeFileSync(path.join(root, "src/lib/admin-i18n/fr.json"), JSON.stringify(french));
    writeFileSync(
      path.join(root, "scripts/admin-i18n/locale-exceptions.json"),
      JSON.stringify({ fr: { "{days} Days": "Reviewed fixture wording for French only" } }),
    );
    expect(audit(root).status).toBe(0);
    writeFileSync(
      path.join(root, "src/lib/admin-i18n/pl.json"),
      JSON.stringify({ ...french, "Eval error: {diagnostic}": "Błąd: {diagnostic}" }),
    );
    const { status, report } = audit(root);
    expect(status).toBe(1);
    expect(report.findings).toContainEqual(
      expect.objectContaining({ kind: "unreviewed-identical-translation", locale: "pl", text: "{days} Days" }),
    );
  });
});

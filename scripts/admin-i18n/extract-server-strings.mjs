/** Collect Kener-owned display messages; never read runtime databases or secrets. */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const fields = new Set([
  "error_message",
  "permission_name",
  "role_name",
  "display_name",
  "displayName",
  "description",
  "label",
  "title",
  "placeholder",
  "help",
  "hint",
  "message",
  "error",
  "errorMessage",
  "tooltip",
  "unitLabel",
  "summary",
]);
const normalize = (text) => text.replace(/\s+/g, " ").trim();
const titleCase = (text) => text.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
function propertyName(node, ast) {
  return node?.getText(ast).replace(/["']/g, "");
}
function messageText(node) {
  const values = [];
  function serialize(part) {
    if (ts.isStringLiteralLike(part)) return part.text;
    if (ts.isTemplateExpression(part))
      return (
        part.head.text + part.templateSpans.map((span) => serializeValue(span.expression) + span.literal.text).join("")
      );
    if (ts.isBinaryExpression(part) && part.operatorToken.kind === ts.SyntaxKind.PlusToken)
      return serialize(part.left) + serialize(part.right);
    return serializeValue(part);
  }
  function serializeValue(part) {
    values.push(part.getText());
    return "{value" + (values.length - 1) + "}";
  }
  return { text: normalize(serialize(node)), values };
}
export function extractServerStrings(root = process.cwd()) {
  const files = [];
  for (const source of [
    "src/lib/server/controllers",
    "src/lib/server/data",
    "src/lib/server/services",
    "src/lib/server/db/seedSiteData.ts",
    "src/lib/allPerms.ts",
    "src/lib/global-constants.ts",
    "src/routes/(account)",
    "src/lib/alerts",
    "seeds/roles.ts",
    "src/lib/server/templates/general",
  ]) {
    const absolute = path.join(root, source);
    if (fs.existsSync(absolute)) files.push(...(fs.statSync(absolute).isDirectory() ? walk(absolute) : [absolute]));
  }
  const rows = [];
  for (const file of files.filter((file) => /\.(ts|js)$/.test(file) && !file.endsWith(".test.ts"))) {
    const source = fs.readFileSync(file, "utf8");
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const relative = path.relative(root, file);
    function record(node, category, text, values = []) {
      text = normalize(text);
      if (/[A-Za-z]/.test(text) && !/^https?:|^\//.test(text) && text.length < 1600 && !text.includes("=>"))
        rows.push({
          text,
          file: relative,
          line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1,
          category,
          values,
        });
    }
    function visit(node) {
      const isText = ts.isStringLiteralLike(node) || ts.isTemplateExpression(node);
      const isConcat = ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken;
      if (isText || isConcat) {
        const parent = node.parent;
        let category;
        const key = ts.isPropertyAssignment(parent) ? propertyName(parent.name, ast) : null;
        if (fields.has(key)) category = "display-property";
        if (ts.isNewExpression(parent) && parent.expression.getText(ast) === "Error") category = "error";
        if (ts.isCallExpression(parent) && ["error", "fail"].includes(parent.expression.getText(ast)))
          category = "error";
        if (relative.endsWith("global-constants.ts") && key?.includes("ERROR")) category = "error";
        let declaration = parent;
        while (declaration && !ts.isVariableDeclaration(declaration)) declaration = declaration.parent;
        if (declaration && /ERROR_MESSAGES$/.test(declaration.name.getText(ast))) category = "error-message-table";
        if (relative === "src/lib/alerts/alert-text.ts" && ts.isReturnStatement(parent)) category = "alert-description";
        if (
          relative.startsWith("src/lib/server/services/") &&
          isText &&
          !node.text?.includes("\n") &&
          /[A-Za-z]{2,} /.test(node.text ?? node.head?.text ?? "")
        )
          category ??= "service-diagnostic";
        if (category) {
          const value = messageText(node);
          record(node, category, value.text, value.values);
        }
        if (
          isText &&
          key === "id" &&
          relative === "src/lib/allPerms.ts" &&
          parent.parent.properties?.some((property) => propertyName(property.name, ast) === "permission_name")
        )
          record(node, "derived-permission-group", titleCase(node.text.split(".")[0]));
        if (isText && key === "template_id" && relative.startsWith("src/lib/server/templates/general/"))
          record(node, "derived-template-name", titleCase(node.text));
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
  return rows;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  console.log(JSON.stringify(extractServerStrings(), null, 2));

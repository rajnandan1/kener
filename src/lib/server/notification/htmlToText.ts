import striptags from "striptags";

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

const BLOCKS = "p|div|h[1-6]|ul|ol|table|tr|blockquote|pre|section|header|footer";

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] === "#") {
      const point = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(point) && point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? entity;
  });
}

/**
 * Readable plain text from email HTML: paragraphs and blocks become blank-line separated, list items
 * become "- " lines, line breaks stay, styles and scripts go, and entities are decoded.
 */
export function HtmlToText(html: string): string {
  const withBreaks = html
    .replace(/<(head|style|script|title)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    // As in HTML, a line break in the source is a space; only the tags below break lines.
    .replace(/\s+/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\s*<li[^>]*>\s*/gi, "\n- ")
    .replace(/\s*<\/li>\s*/gi, "\n")
    .replace(new RegExp(`\\s*</?(${BLOCKS})(\\s[^>]*)?>\\s*`, "gi"), "\n\n");
  return decodeEntities(striptags(withBreaks))
    .split("\n")
    .map((line) => line.replace(/[ \t\f\v ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const HAS_HTML = /<\/?[a-z][^>]*>/i;

/** The same template variables, with every value that holds HTML turned into plain text. */
export function PlainTextVariables<T extends Record<string, unknown>>(variables: T): T {
  return Object.fromEntries(
    Object.entries(variables).map(([key, value]) => [
      key,
      typeof value === "string" && HAS_HTML.test(value) ? HtmlToText(value) : value,
    ]),
  ) as T;
}

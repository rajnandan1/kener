import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import markedPlaintify from "marked-plaintify";
import customHeadingId from "marked-custom-heading-id";
import markedAlert from "marked-alert";
import hljs from "highlight.js";

// Create dedicated instances for each use case to avoid cross-contamination
const markedHTML = new Marked();
const markedText = new Marked();

// Configure HTML instance with syntax highlighting
markedHTML.use(customHeadingId());
markedHTML.use(markedAlert());
markedHTML.use(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code: string, lang: string) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
  }),
);
markedHTML.use({
  renderer: {
    link({ href, title, tokens }: { href: string; title?: string | null; tokens: any[] }) {
      const titleAttr = title ? ` title="${title}"` : "";
      const text = this.parser.parseInline(tokens);
      return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
    },
  },
});
markedHTML.setOptions({
  breaks: true,
  gfm: true,
});

// Configure text instance for plain text conversion
markedText.use(markedPlaintify());

/**
 * Convert markdown to HTML with syntax highlighting
 *
 * @param markdown - The markdown string to convert
 * @returns HTML string with syntax-highlighted code blocks
 *
 * @example
 * ```typescript
 * const html = mdToHTML('```javascript\nconst x = 1;\n```');
 * // Returns: <pre><code class="hljs language-javascript">...</code></pre>
 * ```
 */
export default function mdToHTML(markdown: string): string {
  return markedHTML.parse(markdown, { async: false }) as string;
}

/**
 * Convert markdown to plain text
 * Strips all markdown syntax and returns clean text
 *
 * @param markdown - The markdown string to convert
 * @returns Plain text string with markdown syntax removed
 *
 * @example
 * ```typescript
 * const text = mdToText('# Hello **World**');
 * // Returns: 'Hello World'
 * ```
 */
export function mdToText(markdown: string): string {
  const text = markedText.parse(markdown, { async: false }) as string;
  return text.replace(/\s+/g, " ").trim();
}

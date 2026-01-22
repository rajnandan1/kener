import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";

/**
 * Configure marked with syntax highlighting
 * Uses highlight.js for code block syntax highlighting
 */
function configureMarked() {
  // Configure marked with highlight.js
  marked.use(
    markedHighlight({
      langPrefix: "hljs language-",
      highlight(code: string, lang: string) {
        const language = hljs.getLanguage(lang) ? lang : "plaintext";
        return hljs.highlight(code, { language }).value;
      },
    }),
  );

  // Custom renderer to open links in new tab
  const renderer = new marked.Renderer();
  renderer.link = function ({ href, title, tokens }: { href: string; title?: string | null; tokens: any[] }) {
    const titleAttr = title ? ` title="${title}"` : "";
    const text = this.parser.parseInline(tokens);
    return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
  };

  marked.setOptions({
    breaks: true, // Convert line breaks to <br>
    gfm: true, // Enable GitHub Flavored Markdown
    renderer: renderer,
  });
}

/**
 * Convert markdown to HTML with syntax highlighting
 * Initializes marked configuration on first use for optimal performance
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
let isConfigured = false;

export default function mdToHTML(markdown: string): string {
  if (!isConfigured) {
    configureMarked();
    isConfigured = true;
  }

  return marked.parse(markdown) as string;
}

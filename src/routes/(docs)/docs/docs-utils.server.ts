import fm from "front-matter";
import type { DocsConfig, DocsTableOfContentsItem, DocsPage, DocsPageData } from "$lib/types/docs";

// Front-matter attributes interface
interface DocsFrontMatter {
  title?: string;
  description?: string;
}

// Import docs.json directly as a module — bundled at build time
import docsConfigJson from "../docs.json";

// Import all markdown files at build time using Vite's import.meta.glob
// Keys are like: ./content/introduction.md, ./content/monitors/api.md, etc.
const markdownFiles = import.meta.glob("./content/**/*.md", {
  query: "?raw",
  eager: true,
  import: "default",
}) as Record<string, string>;

/**
 * Get the docs configuration
 */
export function getDocsConfig(): DocsConfig {
  return docsConfigJson as DocsConfig;
}

/**
 * Get all pages in a flat array for navigation (including nested pages)
 */
export function getAllPages(): DocsPage[] {
  const config = getDocsConfig();
  const pages: DocsPage[] = [];

  function addPages(pageList: DocsPage[]) {
    for (const page of pageList) {
      pages.push(page);
      if (page.pages && page.pages.length > 0) {
        addPages(page.pages);
      }
    }
  }

  for (const group of config.sidebar) {
    addPages(group.pages);
  }
  return pages;
}

/**
 * Find the group a page belongs to (including nested pages)
 */
export function getPageGroup(slug: string): string | null {
  const config = getDocsConfig();

  function findInPages(pages: DocsPage[]): boolean {
    for (const page of pages) {
      if (page.slug === slug) return true;
      if (page.pages && findInPages(page.pages)) return true;
    }
    return false;
  }

  for (const group of config.sidebar) {
    if (findInPages(group.pages)) {
      return group.group;
    }
  }
  return null;
}

/**
 * Get previous and next pages for navigation
 */
export function getAdjacentPages(slug: string): { prev: DocsPage | null; next: DocsPage | null } {
  const pages = getAllPages();
  const currentIndex = pages.findIndex((p) => p.slug === slug);

  return {
    prev: currentIndex > 0 ? pages[currentIndex - 1] : null,
    next: currentIndex < pages.length - 1 ? pages[currentIndex + 1] : null,
  };
}

/**
 * Read markdown file content for a given slug (raw, with front-matter)
 * Uses Vite's import.meta.glob so content is bundled at build time
 */
export function getRawMarkdownContent(slug: string): string | null {
  // Try direct path first: ./content/{slug}.md
  const directKey = `./content/${slug}.md`;
  if (markdownFiles[directKey]) {
    return markdownFiles[directKey];
  }

  // Try index path: ./content/{slug}/index.md
  const indexKey = `./content/${slug}/index.md`;
  if (markdownFiles[indexKey]) {
    return markdownFiles[indexKey];
  }

  return null;
}

/**
 * Parse front-matter from markdown content
 */
export function parseMarkdownWithFrontMatter(slug: string): {
  body: string;
  attributes: DocsFrontMatter;
} | null {
  const rawContent = getRawMarkdownContent(slug);
  if (!rawContent) return null;

  const parsed = fm<DocsFrontMatter>(rawContent);
  return {
    body: parsed.body,
    attributes: parsed.attributes,
  };
}

/**
 * Read markdown file content for a given slug (body only, without front-matter)
 */
export function getMarkdownContent(slug: string): string | null {
  const parsed = parseMarkdownWithFrontMatter(slug);
  return parsed ? parsed.body : null;
}

/**
 * Extract table of contents from markdown content
 */
export function extractTableOfContents(htmlContent: string): DocsTableOfContentsItem[] {
  const items: DocsTableOfContentsItem[] = [];
  const headingRegex = /<h([2-4])[^>]*id="([^"]*)"[^>]*>([^<]*)<\/h[2-4]>/gi;

  let match;
  while ((match = headingRegex.exec(htmlContent)) !== null) {
    items.push({
      level: parseInt(match[1]),
      id: match[2],
      text: match[3].trim(),
    });
  }

  return items;
}

/**
 * Add IDs to headings in HTML content for anchor links
 */
export function addHeadingIds(htmlContent: string): string {
  let counter = 0;
  return htmlContent.replace(/<h([2-4])([^>]*)>([^<]*)<\/h([2-4])>/gi, (match, level, attrs, text) => {
    // Create slug from heading text
    const id = text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    const uniqueId = id || `heading-${counter++}`;

    // Check if id already exists in attrs
    if (attrs.includes('id="')) {
      return match;
    }

    return `<h${level} id="${uniqueId}"${attrs}>${text}</h${level}>`;
  });
}

/**
 * Get page data for a specific slug
 */
export function getDocsPageData(slug: string): DocsPageData | null {
  const config = getDocsConfig();
  const pages = getAllPages();
  const page = pages.find((p) => p.slug === slug);

  if (!page) {
    return null;
  }

  const parsed = parseMarkdownWithFrontMatter(slug);
  if (!parsed) {
    return null;
  }

  const { prev, next } = getAdjacentPages(slug);
  const group = getPageGroup(slug);

  // Use front-matter title/description if available, fallback to config
  const title = parsed.attributes.title || page.title;
  const description = parsed.attributes.description || "";

  return {
    title,
    description,
    slug: page.slug,
    content: parsed.body,
    tableOfContents: [], // Will be populated after HTML conversion
    prevPage: prev,
    nextPage: next,
    group: group || "",
  };
}

/**
 * Check if a doc exists
 */
export function docExists(slug: string): boolean {
  const pages = getAllPages();
  return pages.some((p) => p.slug === slug);
}

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fm from "front-matter";
import type { DocsConfig, DocsTableOfContentsItem, DocsPage, DocsPageData } from "$lib/types/docs";

// Front-matter attributes interface
interface DocsFrontMatter {
  title?: string;
  description?: string;
}

// Use __dirname equivalent for ES modules to get correct path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOCS_DIR = path.join(__dirname, "content");
const DOCS_CONFIG_PATH = path.join(__dirname, "../docs.json");

/**
 * Get the docs configuration
 */
export function getDocsConfig(): DocsConfig {
  const configContent = fs.readFileSync(DOCS_CONFIG_PATH, "utf-8");
  return JSON.parse(configContent) as DocsConfig;
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
 */
function getRawMarkdownContent(slug: string): string | null {
  const filePath = path.join(DOCS_DIR, `${slug}.md`);

  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf-8");
    }
    // Try with index.md for nested folders
    const indexPath = path.join(DOCS_DIR, slug, "index.md");
    if (fs.existsSync(indexPath)) {
      return fs.readFileSync(indexPath, "utf-8");
    }
    return null;
  } catch {
    return null;
  }
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

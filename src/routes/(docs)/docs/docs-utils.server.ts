import fm from "front-matter";
import type {
  DocsConfig,
  DocsTableOfContentsItem,
  DocsPage,
  DocsPageSource,
  DocsPageData,
  DocsRootConfig,
  DocsSidebarGroup,
  DocsSidebarGroupSource,
  DocsVersion,
  DocsVersionMeta,
} from "$lib/types/docs";

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

function getFirstPageSlugFromSidebar(sidebar: DocsConfig["sidebar"]): string | null {
  for (const group of sidebar) {
    for (const page of group.pages) {
      if (page.slug) {
        return page.slug;
      }
      if (page.pages && page.pages.length > 0) {
        const nested = page.pages.find((nestedPage) => nestedPage.slug);
        if (nested?.slug) {
          return nested.slug;
        }
      }
    }
  }
  return null;
}

function normalizePage(page: DocsPageSource): DocsPage {
  const resolvedPath = page.content ?? page.slug;

  if (!resolvedPath) {
    throw new Error(`Docs page \"${page.title}\" must define content`);
  }

  return {
    title: page.title,
    content: resolvedPath,
    slug: resolvedPath,
    pages: page.pages?.map(normalizePage),
  };
}

function normalizeSidebar(sidebar: DocsSidebarGroupSource[]): DocsSidebarGroup[] {
  return sidebar.map((group) => ({
    group: group.group,
    collapsible: group.collapsible,
    pages: group.pages.map(normalizePage),
  }));
}

function normalizeVersionMeta(versions: DocsVersion[]): DocsVersionMeta[] {
  return versions.map((version) => ({
    ...(version as DocsVersionMeta),
    name: version.name,
    slug: version.slug,
    latest: version.latest,
    firstPageSlug: getFirstPageSlugFromSidebar(normalizeSidebar(version.content.sidebar)),
  }));
}

function getLatestVersion(versions: DocsVersion[]): DocsVersion | null {
  if (versions.length === 0) return null;
  return versions.find((version) => version.latest) ?? versions[0];
}

function getSelectedVersion(versions: DocsVersion[], requestedVersionSlug?: string): DocsVersion | null {
  if (versions.length === 0) return null;

  if (requestedVersionSlug) {
    const exact = versions.find((version) => version.slug === requestedVersionSlug);
    if (exact) return exact;
  }

  return getLatestVersion(versions);
}

/**
 * Get the docs configuration
 */
export function getDocsRootConfig(): DocsRootConfig {
  return docsConfigJson as DocsRootConfig;
}

/**
 * Get the docs configuration for a selected version slug (or latest)
 */
export function getDocsConfig(requestedVersionSlug?: string): DocsConfig {
  const rootConfig = getDocsRootConfig();
  const versions = rootConfig.versions;
  const selectedVersion = getSelectedVersion(versions, requestedVersionSlug);

  if (!selectedVersion) {
    return {
      name: rootConfig.name,
      logo: rootConfig.logo,
      favicon: rootConfig.favicon,
      sidebar: [],
      versions: [],
      activeVersion: null,
    };
  }

  return {
    $schema: rootConfig.$schema,
    name: rootConfig.name,
    logo: rootConfig.logo,
    favicon: rootConfig.favicon,
    navigation: selectedVersion.content.navigation,
    sidebar: normalizeSidebar(selectedVersion.content.sidebar),
    footerLinks: selectedVersion.content.footerLinks,
    versions: normalizeVersionMeta(versions),
    activeVersion: selectedVersion.slug,
  };
}

/**
 * Get available version metadata from docs config
 */
export function getDocsVersions(): DocsVersionMeta[] {
  const rootConfig = getDocsRootConfig();
  return normalizeVersionMeta(rootConfig.versions);
}

/**
 * Resolve version slug and docs page slug from a docs path segment.
 * Example: "v4/setup/email-setup" => { versionSlug: "v4", pageSlug: "setup/email-setup" }
 */
export function resolveVersionedDocsSlug(rawSlug: string): { versionSlug?: string; pageSlug: string } {
  const cleanSlug = rawSlug.replace(/^\/+|\/+$/g, "");

  if (!cleanSlug) {
    return { pageSlug: "" };
  }

  const parts = cleanSlug.split("/");
  const maybeVersion = parts[0];
  const versions = getDocsVersions().map((version) => version.slug);

  if (versions.includes(maybeVersion)) {
    return {
      versionSlug: maybeVersion,
      pageSlug: parts.slice(1).join("/"),
    };
  }

  return { pageSlug: cleanSlug };
}

/**
 * Get first page slug from the resolved docs config.
 */
export function getFirstPageSlug(config: DocsConfig): string | null {
  return getFirstPageSlugFromSidebar(config.sidebar);
}

/**
 * Resolve a route page slug against sidebar entries, supporting both
 * unprefixed (e.g. "home") and version-prefixed (e.g. "v3/home") slugs.
 */
export function resolvePageSlugForConfig(pageSlug: string, config: DocsConfig, versionSlug?: string): string | null {
  const pages = getAllPages(config);
  const available = new Set(pages.map((page) => page.slug));

  if (available.has(pageSlug)) {
    return pageSlug;
  }

  if (versionSlug && pageSlug) {
    const versionPrefixed = `${versionSlug}/${pageSlug}`;
    if (available.has(versionPrefixed)) {
      return versionPrefixed;
    }
  }

  if (versionSlug && pageSlug.startsWith(`${versionSlug}/`)) {
    const unprefixed = pageSlug.slice(versionSlug.length + 1);
    if (available.has(unprefixed)) {
      return unprefixed;
    }
  }

  return null;
}

/**
 * Get all pages in a flat array for navigation (including nested pages)
 */
export function getAllPages(config: DocsConfig = getDocsConfig()): DocsPage[] {
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
export function getPageGroup(slug: string, config: DocsConfig = getDocsConfig()): string | null {
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
export function getAdjacentPages(
  slug: string,
  config: DocsConfig = getDocsConfig(),
): { prev: DocsPage | null; next: DocsPage | null } {
  const pages = getAllPages(config);
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
export function getDocsPageData(slug: string, config: DocsConfig = getDocsConfig()): DocsPageData | null {
  const pages = getAllPages(config);
  const page = pages.find((p) => p.slug === slug);

  if (!page) {
    return null;
  }

  const parsed = parseMarkdownWithFrontMatter(slug);
  if (!parsed) {
    return null;
  }

  const { prev, next } = getAdjacentPages(slug, config);
  const group = getPageGroup(slug, config);

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
export function docExists(slug: string, config: DocsConfig = getDocsConfig()): boolean {
  const pages = getAllPages(config);
  return pages.some((p) => p.slug === slug);
}

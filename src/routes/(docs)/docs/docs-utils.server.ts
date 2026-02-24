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

function createTabKey(tabName: string): string {
  return tabName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function sidebarHasSlug(sidebar: DocsSidebarGroupSource[], pageSlug: string, versionSlug?: string): boolean {
  if (!pageSlug) {
    return false;
  }

  const normalizedSidebar = normalizeSidebar(sidebar);
  const availableSlugs = new Set<string>();

  function addPages(pages: DocsPage[]) {
    for (const page of pages) {
      availableSlugs.add(page.slug);
      if (page.pages && page.pages.length > 0) {
        addPages(page.pages);
      }
    }
  }

  for (const group of normalizedSidebar) {
    addPages(group.pages);
  }

  if (availableSlugs.has(pageSlug)) {
    return true;
  }

  if (versionSlug && pageSlug) {
    const versionPrefixed = `${versionSlug}/${pageSlug}`;
    if (availableSlugs.has(versionPrefixed)) {
      return true;
    }
  }

  if (versionSlug && pageSlug.startsWith(`${versionSlug}/`)) {
    const unprefixed = pageSlug.slice(versionSlug.length + 1);
    if (availableSlugs.has(unprefixed)) {
      return true;
    }
  }

  return false;
}

function getPrimarySidebarSource(version: DocsVersion): DocsSidebarGroupSource[] {
  const tabs = version.content.navigation?.tabs ?? [];
  const firstSidebarTab = tabs.find((tab) => (tab.sidebar?.length ?? 0) > 0);
  return firstSidebarTab?.sidebar ?? [];
}

function normalizeNavigationTabs(version: DocsVersion) {
  const tabs = version.content.navigation?.tabs ?? [];
  return tabs.map((tab, index) => {
    const fallbackKey = `tab-${index + 1}`;
    const key = createTabKey(tab.name) || fallbackKey;

    return {
      ...tab,
      key,
      firstPageSlug: getFirstPageSlugFromSidebar(normalizeSidebar(tab.sidebar ?? [])),
    };
  });
}

function resolveActiveTab(version: DocsVersion, requestedTabKey?: string, requestedPageSlug?: string) {
  const tabs = normalizeNavigationTabs(version);
  const firstSidebarTab = tabs.find((tab) => (tab.sidebar?.length ?? 0) > 0) ?? tabs[0];

  if (!firstSidebarTab) {
    return {
      tabs,
      activeTab: null,
    };
  }

  if (requestedTabKey) {
    const requested = tabs.find((tab) => tab.key === requestedTabKey);
    if (requested && (requested.sidebar?.length ?? 0) > 0) {
      return {
        tabs,
        activeTab: requested,
      };
    }
  }

  if (requestedPageSlug) {
    const matchedByPage = tabs.find(
      (tab) => (tab.sidebar?.length ?? 0) > 0 && sidebarHasSlug(tab.sidebar ?? [], requestedPageSlug, version.slug),
    );
    if (matchedByPage) {
      return {
        tabs,
        activeTab: matchedByPage,
      };
    }
  }

  return {
    tabs,
    activeTab: firstSidebarTab,
  };
}

function normalizeVersionMeta(versions: DocsVersion[]): DocsVersionMeta[] {
  return versions.map((version) => ({
    ...(version as DocsVersionMeta),
    name: version.name,
    slug: version.slug,
    latest: version.latest,
    firstPageSlug: getFirstPageSlugFromSidebar(normalizeSidebar(getPrimarySidebarSource(version))),
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

function normalizeAbsoluteUrl(baseDomain: string, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${baseDomain.replace(/\/+$/, "")}${path}`;
}

function collectSidebarPagePaths(pages: DocsPageSource[], output: Set<string>) {
  for (const page of pages) {
    const resolvedPath = (page.content ?? page.slug ?? "").trim();
    if (resolvedPath) {
      output.add(resolvedPath.replace(/^\/+/, ""));
    }

    if (page.pages && page.pages.length > 0) {
      collectSidebarPagePaths(page.pages, output);
    }
  }
}

function collectVersionDocsPaths(version: DocsVersion): string[] {
  const output = new Set<string>();
  const tabs = version.content.navigation?.tabs ?? [];

  for (const tab of tabs) {
    if (tab.sidebar) {
      for (const group of tab.sidebar) {
        collectSidebarPagePaths(group.pages, output);
      }
    }

    if (tab.url?.trim()) {
      output.add(tab.url.trim());
    }
  }

  return Array.from(output);
}

function collectVersionDocPageSlugs(version: DocsVersion): string[] {
  const output = new Set<string>();
  const tabs = version.content.navigation?.tabs ?? [];

  for (const tab of tabs) {
    if (!tab.sidebar) {
      continue;
    }

    for (const group of tab.sidebar) {
      collectSidebarPagePaths(group.pages, output);
    }
  }

  return Array.from(output);
}

function titleFromSlug(slug: string): string {
  const leaf = slug.split("/").filter(Boolean).pop();

  if (!leaf) {
    return "Untitled";
  }

  return leaf.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeText(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export interface DocsLlmEntry {
  title: string;
  description: string;
  url: string;
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
export function getDocsConfig(
  requestedVersionSlug?: string,
  requestedTabKey?: string,
  requestedPageSlug?: string,
): DocsConfig {
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
      activeTabKey: null,
    };
  }

  const { tabs, activeTab } = resolveActiveTab(selectedVersion, requestedTabKey, requestedPageSlug);
  const activeSidebarSource = activeTab?.sidebar ?? [];

  return {
    $schema: rootConfig.$schema,
    name: rootConfig.name,
    logo: rootConfig.logo,
    favicon: rootConfig.favicon,
    navigation: {
      ...selectedVersion.content.navigation,
      tabs,
    },
    sidebar: normalizeSidebar(activeSidebarSource),
    footerLinks: selectedVersion.content.footerLinks,
    versions: normalizeVersionMeta(versions),
    activeVersion: selectedVersion.slug,
    activeTabKey: activeTab?.key ?? null,
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
 * Get a docs version by slug.
 */
export function getDocsVersionBySlug(versionSlug: string): DocsVersion | null {
  const rootConfig = getDocsRootConfig();
  return rootConfig.versions.find((version) => version.slug === versionSlug) ?? null;
}

/**
 * Build absolute URLs for docs content of a specific version.
 * Includes all sidebar pages across tabs plus any tab.url entries.
 */
export function getVersionDocsUrls(versionSlug: string, baseDomain: string): string[] {
  const version = getDocsVersionBySlug(versionSlug);

  if (!version) {
    return [];
  }

  const paths = collectVersionDocsPaths(version);
  const urls = paths
    .map((path) => {
      if (/^https?:\/\//i.test(path)) {
        return path;
      }

      const normalizedPath = path.replace(/^\/+/, "");
      const docsPath = normalizedPath.startsWith("docs/") ? `/${normalizedPath}` : `/docs/${normalizedPath}`;
      return normalizeAbsoluteUrl(baseDomain, docsPath);
    })
    .filter((url) => url.length > 0);

  return Array.from(new Set(urls));
}

/**
 * Build llms.txt entries for a docs version.
 * Uses markdown frontmatter for title/description and emits raw .md URLs.
 */
export function getVersionDocsLlmEntries(versionSlug: string, baseDomain: string): DocsLlmEntry[] {
  const version = getDocsVersionBySlug(versionSlug);

  if (!version) {
    return [];
  }

  const pageSlugs = collectVersionDocPageSlugs(version);
  const entries: DocsLlmEntry[] = [];
  const seenUrls = new Set<string>();

  const tabs = version.content.navigation?.tabs ?? [];

  for (const tab of tabs) {
    const tabUrl = tab.url?.trim();
    if (!tabUrl) {
      continue;
    }

    const url = normalizeAbsoluteUrl(baseDomain, tabUrl);
    if (!url || seenUrls.has(url)) {
      continue;
    }

    seenUrls.add(url);

    entries.push({
      title: normalizeText(tab.name) || titleFromSlug(tabUrl),
      description: tab.name === "API Reference" ? "Interactive API reference for this docs version" : "",
      url,
    });
  }

  for (const pageSlug of pageSlugs) {
    const normalizedSlug = pageSlug.replace(/^\/+/, "");
    if (!normalizedSlug) {
      continue;
    }

    const rawUrl = normalizeAbsoluteUrl(baseDomain, `/docs/raw/${normalizedSlug}.md`);
    if (seenUrls.has(rawUrl)) {
      continue;
    }
    seenUrls.add(rawUrl);

    const parsed = parseMarkdownWithFrontMatter(normalizedSlug);
    const title = normalizeText(parsed?.attributes.title) || titleFromSlug(normalizedSlug);
    const description = normalizeText(parsed?.attributes.description);

    entries.push({
      title,
      description,
      url: rawUrl,
    });
  }

  return entries;
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

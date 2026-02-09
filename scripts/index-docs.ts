/**
 * Standalone script to index documentation content into Redis for full-text search.
 *
 * This script reads docs.json and all markdown files from disk, converts them
 * to plain text, and stores the search documents in Redis. It should be run
 * manually whenever documentation content changes.
 *
 * Usage: npm run index-docs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fm from "front-matter";
import IORedis from "ioredis";
import dotenv from "dotenv";
import { marked } from "marked";
import plaintify from "marked-plaintify";
import { mdToText } from "../src/lib/marked";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOCS_JSON_PATH = path.join(__dirname, "../src/routes/(docs)/docs.json");
const CONTENT_DIR = path.join(__dirname, "../src/routes/(docs)/docs/content");
const REDIS_DOCS_KEY = "kener-docs:search:documents";

interface DocsPage {
  title: string;
  slug: string;
  pages?: DocsPage[];
}

interface DocsSidebarGroup {
  group: string;
  pages: DocsPage[];
}

interface DocsConfig {
  sidebar: DocsSidebarGroup[];
}

interface DocsSearchDocument {
  id: string;
  title: string;
  slug: string;
  group: string;
  content: string;
  rawContent: string;
}

interface DocsSearchIndexData {
  documents: DocsSearchDocument[];
  lastUpdated: number;
}

/**
 * Read markdown content for a slug (body only, without frontmatter)
 */
function getMarkdownContent(slug: string): string | null {
  const directPath = path.join(CONTENT_DIR, `${slug}.md`);

  try {
    let rawContent: string | null = null;

    if (fs.existsSync(directPath)) {
      rawContent = fs.readFileSync(directPath, "utf-8");
    } else {
      const indexPath = path.join(CONTENT_DIR, slug, "index.md");
      if (fs.existsSync(indexPath)) {
        rawContent = fs.readFileSync(indexPath, "utf-8");
      }
    }

    if (!rawContent) return null;

    const parsed = fm(rawContent);
    return parsed.body;
  } catch {
    return null;
  }
}

/**
 * Recursively collect all pages from sidebar groups (including nested pages)
 */
function collectPages(pages: DocsPage[], group: string, result: Array<{ page: DocsPage; group: string }>): void {
  for (const page of pages) {
    result.push({ page, group });
    if (page.pages && page.pages.length > 0) {
      collectPages(page.pages, group, result);
    }
  }
}

async function main(): Promise<void> {
  // Validate Redis URL
  if (!process.env.REDIS_URL) {
    console.error("Error: REDIS_URL environment variable is not set.");
    process.exit(1);
  }

  // Read docs.json
  if (!fs.existsSync(DOCS_JSON_PATH)) {
    console.error(`Error: docs.json not found at ${DOCS_JSON_PATH}`);
    process.exit(1);
  }

  const config: DocsConfig = JSON.parse(fs.readFileSync(DOCS_JSON_PATH, "utf-8"));
  const documents: DocsSearchDocument[] = [];

  // Collect all pages from sidebar
  const allPages: Array<{ page: DocsPage; group: string }> = [];
  for (const sidebarGroup of config.sidebar) {
    collectPages(sidebarGroup.pages, sidebarGroup.group, allPages);
  }

  console.log(`[index-docs] Found ${allPages.length} pages to index`);

  for (const { page, group } of allPages) {
    const markdownContent = getMarkdownContent(page.slug);
    if (markdownContent) {
      const plainContent = mdToText(markdownContent);
      documents.push({
        id: page.slug,
        title: page.title,
        slug: page.slug,
        group,
        content: plainContent,
        rawContent: markdownContent,
      });
    } else {
      console.warn(`[index-docs] No content found for slug: ${page.slug}`);
    }
  }

  console.log(`[index-docs] Indexed ${documents.length} documents`);

  // Store in Redis
  const redis = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });

  const indexData: DocsSearchIndexData = {
    documents,
    lastUpdated: Date.now(),
  };

  await redis.set(REDIS_DOCS_KEY, JSON.stringify(indexData));
  console.log(`[index-docs] Stored ${documents.length} documents in Redis (key: ${REDIS_DOCS_KEY})`);

  await redis.quit();
  console.log("[index-docs] Done.");
}

main().catch((err) => {
  console.error("[index-docs] Fatal error:", err);
  process.exit(1);
});

/**
 * Documentation Search Service using FlexSearch
 * Provides full-text search across all documentation pages
 */

import FlexSearch from "flexsearch";
import { marked } from "marked";
import striptags from "striptags";
import { redisConnection } from "$lib/server/redisConnector";
import type { DocsSearchDocument, DocsSearchResult, DocsSearchIndexData } from "$lib/types/docs-search";
import { getDocsConfig, getMarkdownContent, getAllPages } from "../../routes/(docs)/docs/docs-utils.server";

const REDIS_DOCS_KEY = "kener-docs:search:documents";

// FlexSearch Document index for multi-field search
// Using 'any' type here because FlexSearch's TypeScript types are complex
let searchIndex: any = null;
let documentsMap: Map<string, DocsSearchDocument> = new Map();

/**
 * Convert markdown to plain text using marked and striptags
 */
function stripMarkdown(content: string): string {
  // Convert markdown to HTML
  const html = marked.parse(content, { async: false }) as string;
  // Strip HTML tags and normalize whitespace
  return striptags(html).replace(/\s+/g, " ").trim();
}

/**
 * Create a search excerpt around the matching term
 */
function createExcerpt(content: string, query: string, maxLength: number = 150): string {
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerContent.indexOf(lowerQuery);

  if (index === -1) {
    return content.slice(0, maxLength) + (content.length > maxLength ? "..." : "");
  }

  const start = Math.max(0, index - 50);
  const end = Math.min(content.length, index + query.length + 100);

  let excerpt = content.slice(start, end);

  if (start > 0) excerpt = "..." + excerpt;
  if (end < content.length) excerpt = excerpt + "...";

  return excerpt;
}

/**
 * Create slug from heading text (same logic as addHeadingIds in docs-utils)
 */
function createHeadingSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Find the section (heading) that contains the search query in raw markdown
 * Returns the anchor and section title
 */
function findSectionAnchor(rawContent: string, query: string): { anchor: string; sectionTitle: string } | null {
  const lines = rawContent.split("\n");
  const lowerQuery = query.toLowerCase();

  // Track current heading context
  let currentHeading: { text: string; level: number } | null = null;
  let queryFoundInSection = false;

  for (const line of lines) {
    // Check for heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      // If we found query in previous section, return that heading
      if (queryFoundInSection && currentHeading) {
        return {
          anchor: createHeadingSlug(currentHeading.text),
          sectionTitle: currentHeading.text,
        };
      }

      currentHeading = {
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      };
      queryFoundInSection = false;

      // Also check if the heading itself contains the query
      if (headingMatch[2].toLowerCase().includes(lowerQuery)) {
        queryFoundInSection = true;
      }
    } else {
      // Check if line contains query (non-heading lines)
      if (line.toLowerCase().includes(lowerQuery)) {
        queryFoundInSection = true;
      }
    }
  }

  // Check if query was found in the last section
  if (queryFoundInSection && currentHeading) {
    return {
      anchor: createHeadingSlug(currentHeading.text),
      sectionTitle: currentHeading.text,
    };
  }

  return null;
}

/**
 * Initialize or get the FlexSearch index
 */
function getSearchIndex(): any {
  if (!searchIndex) {
    searchIndex = new FlexSearch.Document({
      document: {
        id: "id",
        index: ["title", "content", "group"],
        store: ["title", "slug", "group", "content", "rawContent"],
      },
      tokenize: "forward",
      resolution: 9,
      cache: 100,
    });
  }
  return searchIndex;
}

/**
 * Build the search index from all documentation pages
 */
export async function buildSearchIndex(): Promise<void> {
  const index = getSearchIndex();
  const config = getDocsConfig();
  const documents: DocsSearchDocument[] = [];

  // Clear existing index
  documentsMap.clear();

  for (const group of config.sidebar) {
    for (const page of group.pages) {
      const markdownContent = getMarkdownContent(page.slug);
      if (markdownContent) {
        const plainContent = stripMarkdown(markdownContent);
        const doc: DocsSearchDocument = {
          id: page.slug,
          title: page.title,
          slug: page.slug,
          group: group.group,
          content: plainContent,
          rawContent: markdownContent, // Store raw for section detection
        };

        documents.push(doc);
        documentsMap.set(page.slug, doc);
        index.add(doc);
      } else {
        console.warn(`[docs-search] No content found for slug: ${page.slug}`);
      }
    }
  }

  // Store in Redis for persistence
  try {
    const redis = redisConnection();
    const indexData: DocsSearchIndexData = {
      documents,
      lastUpdated: Date.now(),
    };
    await redis.set(REDIS_DOCS_KEY, JSON.stringify(indexData));
    console.log(`[docs-search] Stored ${documents.length} documents in Redis`);
  } catch (error) {
    console.warn("[docs-search] Failed to persist search index to Redis:", error);
  }
}

/**
 * Load the search index from Redis if available
 */
export async function loadSearchIndex(): Promise<boolean> {
  try {
    const redis = redisConnection();
    const data = await redis.get(REDIS_DOCS_KEY);

    if (data) {
      const indexData: DocsSearchIndexData = JSON.parse(data);
      const index = getSearchIndex();

      // Clear and rebuild from stored documents
      documentsMap.clear();

      for (const doc of indexData.documents) {
        documentsMap.set(doc.slug, doc);
        index.add(doc);
      }

      return true;
    }
  } catch (error) {
    console.warn("Failed to load search index from Redis:", error);
  }

  return false;
}

/**
 * Ensure the search index is initialized
 */
export async function ensureSearchIndex(): Promise<void> {
  if (documentsMap.size === 0) {
    const loaded = await loadSearchIndex();
    if (!loaded) {
      await buildSearchIndex();
    }
  }
}

/**
 * Search the documentation
 */
export async function searchDocs(query: string, limit: number = 10): Promise<DocsSearchResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  await ensureSearchIndex();

  const index = getSearchIndex();
  const results = index.search(query, {
    limit: limit * 3, // Get more results to dedupe across fields
    enrich: true,
  });

  // Collect unique results from all fields
  const seenSlugs = new Set<string>();
  const searchResults: DocsSearchResult[] = [];

  try {
    for (const fieldResult of results) {
      for (const result of fieldResult.result) {
        // Get the document ID from the result
        const docId = typeof result === "object" && "id" in result ? String(result.id) : String(result);
        // Always use documentsMap to get the full document with rawContent
        const doc = documentsMap.get(docId);

        if (doc && !seenSlugs.has(doc.slug)) {
          seenSlugs.add(doc.slug);

          // Find the section anchor where the query appears
          const sectionInfo = doc.rawContent ? findSectionAnchor(doc.rawContent, query) : null;

          searchResults.push({
            id: doc.id,
            title: doc.title,
            slug: doc.slug,
            group: doc.group,
            content: doc.content,
            excerpt: createExcerpt(doc.content, query),
            anchor: sectionInfo?.anchor,
            sectionTitle: sectionInfo?.sectionTitle,
          });
        }
      }
    }
  } catch (error) {
    console.error("[docs-search] Error processing results:", error);
  }

  return searchResults.slice(0, limit);
}

/**
 * Rebuild the search index (for internal use during server startup)
 */
export async function rebuildSearchIndex(): Promise<void> {
  // Reset the index
  searchIndex = null;
  documentsMap.clear();

  await buildSearchIndex();
  console.log(`[docs-search] Search index built with ${documentsMap.size} documents`);
}

/**
 * Initialize the search index at server startup
 * Always rebuilds to ensure fresh content
 */
export async function initializeSearchIndex(): Promise<void> {
  try {
    await rebuildSearchIndex();
  } catch (error) {
    console.error("[docs-search] Failed to initialize search index:", error);
  }
}

/**
 * Get all indexed documents (for debugging)
 */
export function getIndexedDocuments(): DocsSearchDocument[] {
  return Array.from(documentsMap.values());
}

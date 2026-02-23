/**
 * Documentation Search Service using FlexSearch
 * Provides full-text search across all documentation pages.
 * Search index is populated from Redis (use `npm run index-docs` to build it).
 */

import FlexSearch from "flexsearch";
import { redisConnection } from "$lib/server/redisConnector";
import type { DocsSearchDocument, DocsSearchResult, DocsSearchIndexData } from "$lib/types/docs-search";

const REDIS_DOCS_KEY = "kener-docs:search:documents";

// FlexSearch Document index for multi-field search
// Using 'any' type here because FlexSearch's TypeScript types are complex
let searchIndex: any = null;
let documentsMap: Map<string, DocsSearchDocument> = new Map();

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
 * Create slug from heading text.
 * If the heading contains a custom ID like {#my-id}, use that directly.
 * Otherwise, generate a slug from the text (same as marked-gfm-heading-id).
 */
function createHeadingSlug(text: string): string {
  // Check for custom heading ID syntax: ## Heading {#custom-id}
  const customIdMatch = text.match(/\{#([^}]+)\}\s*$/);
  if (customIdMatch) {
    return customIdMatch[1].trim();
  }

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
 * Load the search index from Redis.
 * The index must be built beforehand using `npm run index-docs`.
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
 * Ensure the search index is loaded from Redis
 */
export async function ensureSearchIndex(): Promise<void> {
  if (documentsMap.size === 0) {
    const loaded = await loadSearchIndex();
    if (!loaded) {
      console.warn("[docs-search] No search index found in Redis. Run `npm run index-docs` to build it.");
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
 * Get all indexed documents (for debugging)
 */
export function getIndexedDocuments(): DocsSearchDocument[] {
  return Array.from(documentsMap.values());
}

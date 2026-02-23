/**
 * Types for documentation search functionality
 */

export interface DocsSearchResult {
  id: string;
  title: string;
  slug: string;
  group: string;
  content: string;
  excerpt: string;
  anchor?: string; // Section anchor for deep linking
  sectionTitle?: string; // Title of the section containing the match
}

export interface DocsSearchDocument {
  id: string;
  title: string;
  slug: string;
  group: string;
  content: string;
  rawContent: string; // Original markdown for section detection
}

export interface DocsSearchIndexData {
  documents: DocsSearchDocument[];
  lastUpdated: number;
}

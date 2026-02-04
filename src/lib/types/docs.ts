/**
 * Types for the documentation system
 */

export interface DocsLogo {
  light: string;
  dark: string;
}

export interface DocsNavTab {
  name: string;
  url: string;
}

export interface DocsNavigation {
  tabs: DocsNavTab[];
}

export interface DocsPage {
  title: string;
  slug: string;
  pages?: DocsPage[]; // Nested pages for one more level
}

export interface DocsSidebarGroup {
  group: string;
  pages: DocsPage[];
  collapsible?: boolean;
}

export interface DocsFooterLink {
  name: string;
  url: string;
}

export interface DocsConfig {
  $schema?: string;
  name: string;
  logo?: DocsLogo;
  favicon?: string;
  navigation?: DocsNavigation;
  sidebar: DocsSidebarGroup[];
  footerLinks?: DocsFooterLink[];
}

export interface DocsTableOfContentsItem {
  id: string;
  text: string;
  level: number;
}

export interface DocsPageData {
  title: string;
  description?: string;
  slug: string;
  content: string;
  tableOfContents: DocsTableOfContentsItem[];
  prevPage: DocsPage | null;
  nextPage: DocsPage | null;
  group: string;
}

export interface DocsLayoutData {
  config: DocsConfig;
  currentSlug: string;
  isMobile: boolean;
}

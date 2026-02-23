/**
 * Types for the documentation system
 */

export interface DocsLogo {
  light: string;
  dark: string;
}

export interface DocsNavTab {
  name: string;
  url?: string;
  key?: string;
  firstPageSlug?: string | null;
  sidebar?: DocsSidebarGroupSource[];
}

export interface DocsNavigation {
  tabs: DocsNavTab[];
}

export interface DocsPageSource {
  title: string;
  content?: string;
  slug?: string;
  pages?: DocsPageSource[];
}

export interface DocsPage {
  title: string;
  slug: string;
  content?: string;
  pages?: DocsPage[]; // Nested pages for one more level
}

export interface DocsSidebarGroupSource {
  group: string;
  pages: DocsPageSource[];
  collapsible?: boolean;
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

export interface DocsVersionMeta {
  name: string;
  slug: string;
  latest?: boolean;
  firstPageSlug?: string | null;
}

export interface DocsVersionContent {
  navigation?: DocsNavigation;
  footerLinks?: DocsFooterLink[];
}

export interface DocsVersion extends DocsVersionMeta {
  content: DocsVersionContent;
}

export interface DocsRootConfig {
  $schema?: string;
  name: string;
  logo?: DocsLogo;
  favicon?: string;
  versions: DocsVersion[];
}

export interface DocsConfig {
  $schema?: string;
  name: string;
  logo?: DocsLogo;
  favicon?: string;
  navigation?: DocsNavigation;
  sidebar: DocsSidebarGroup[];
  footerLinks?: DocsFooterLink[];
  versions?: DocsVersionMeta[];
  activeVersion?: string | null;
  activeTabKey?: string | null;
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

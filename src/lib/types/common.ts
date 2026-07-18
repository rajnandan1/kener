export interface PaginationInput {
  page: number;
  limit: number;
}

export interface MonitorTableUptime {
  range: string;
  percentage: string;
}

export interface MonitorTableRow {
  name: string;
  status: string;
  responseTime: string;
  uptimes: MonitorTableUptime[];
}

/**
 * Per-entity content translations: locale code -> field name -> translated text.
 * Example: { "de": { "name": "Webseite" }, "fr": { "name": "Site web" } }
 */
export type ContentTranslations = Record<string, Record<string, string>>;

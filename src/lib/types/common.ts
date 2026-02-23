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

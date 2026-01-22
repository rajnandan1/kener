import { GetAllSiteData } from "$lib/server/controllers/controller.js";

export interface StatusColors {
  UP: string;
  DEGRADED: string;
  DOWN: string;
  MAINTENANCE: string;
  NO_DATA: string;
}

interface SiteColors {
  UP?: string;
  DEGRADED?: string;
  DOWN?: string;
  MAINTENANCE?: string;
}

async function StatusColor(_status?: string): Promise<StatusColors> {
  let site = (await GetAllSiteData()) as { colors?: SiteColors };
  return {
    UP: site.colors?.UP || "#00dfa2",
    DEGRADED: site.colors?.DEGRADED || "#e6ca61",
    DOWN: site.colors?.DOWN || "#ca3038",
    MAINTENANCE: site.colors?.MAINTENANCE || "#6679cc",
    NO_DATA: "#f1f5f8",
  };
}

export default StatusColor;

import { json, type RequestHandler } from "@sveltejs/kit";
import db from "$lib/server/db/db";
import type { GetSiteDataResponse, SiteDataItem } from "$lib/types/api";
import { SanitizeSiteDataValue } from "$lib/server/controllers/siteDataSanitizer";

export const GET: RequestHandler = async () => {
  const rawData = await db.getAllSiteData();

  const siteData: SiteDataItem[] = rawData.map((item) => {
    const value = item.data_type === "object" ? JSON.parse(item.value) : item.value;
    return {
      key: item.key,
      value: SanitizeSiteDataValue(item.key, value),
      data_type: item.data_type,
    };
  });

  const response: GetSiteDataResponse = {
    site_data: siteData,
  };

  return json(response);
};

import { json, type RequestHandler } from "@sveltejs/kit";
import db from "$lib/server/db/db";
import { MaskSiteDataSecret } from "$lib/server/controllers/siteDataController";
import type { GetSiteDataResponse, SiteDataItem } from "$lib/types/api";

export const GET: RequestHandler = async () => {
  const rawData = await db.getAllSiteData();

  const siteData: SiteDataItem[] = rawData.map((item) => ({
    key: item.key,
    value: MaskSiteDataSecret(item.key, item.data_type === "object" ? JSON.parse(item.value) : item.value),
    data_type: item.data_type,
  }));

  const response: GetSiteDataResponse = {
    site_data: siteData,
  };

  return json(response);
};

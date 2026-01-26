import { json, error } from "@sveltejs/kit";
import type { APIServerRequest } from "$lib/server/types/api-server";
import db from "$lib/server/db/db";

export interface MaintenanceInfoResponse {
  id: string;
  title: string;
}

/**
 * GET /dashboard-apis/maintenance-info?ids=id1,id2,id3
 * Returns basic maintenance information (id and title) for given maintenance IDs
 */
export default async function get(req: APIServerRequest): Promise<Response> {
  const idsParam = req.query.get("ids");

  if (!idsParam) {
    return error(400, { message: "ids query parameter is required" });
  }

  const ids = idsParam
    .split(",")
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => !isNaN(id));

  if (ids.length === 0) {
    return error(400, { message: "At least one valid id is required" });
  }

  const maintenances = await db.getMaintenancesByIds(ids);

  const result: MaintenanceInfoResponse[] = maintenances.map((maintenance) => ({
    id: String(maintenance.id),
    title: maintenance.title,
  }));

  return json(result);
}

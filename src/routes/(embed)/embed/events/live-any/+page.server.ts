import type { PageServerLoad } from "../$types";
import db from "$lib/server/db/db";

import { GetNowTimestampUTC } from "$lib/server/tool";

export const load: PageServerLoad = async ({ params, parent }) => {
  const ts = GetNowTimestampUTC();
  const ongoingIncidents = await db.getAllGlobalOngoingIncidentsWithComments(ts);
  const ongoingMaintenancesEvents = await db.getAllGlobalOngoingMaintenanceEvents(ts);
  return {
    ...{
      incidents: ongoingIncidents,
      maintenance_events: ongoingMaintenancesEvents,
    },
  };
};

import type { PageServerLoad } from "./$types";
import { parseIntParam } from "$lib/server/api-server/monitor-bar/shared";

const DEFAULT_DAYS = 90;
const MAX_DAYS = 90;

export const load: PageServerLoad = async ({ params, url }) => {
  const { tag } = params;
  const theme = url.searchParams.get("theme");
  const daysParam = url.searchParams.get("days");
  const days = Math.min(MAX_DAYS, Math.max(1, parseIntParam(daysParam, DEFAULT_DAYS)));

  return {
    monitorTag: tag,
    days,
    theme,
  };
};

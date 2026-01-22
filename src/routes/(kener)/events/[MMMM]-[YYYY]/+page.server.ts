import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";
import { parse, isValid, getYear, startOfMonth, endOfMonth, addMonths, getUnixTime } from "date-fns";
import { GetPageByPathWithMonitors } from "$lib/server/controllers/controller.js";
import { GetAllPages } from "$lib/server/controllers/pagesController.js";
import type { PageNavItem } from "$lib/server/controllers/dashboardController.js";

const MIN_YEAR = 2023;

export const load: PageServerLoad = async ({ params, parent }) => {
  const parentData = await parent();
  const localTz = parentData.localTz;

  // Parse month parameter (format: MMMM-YYYY e.g. "January-2026")
  const monthParam = `${params.MMMM}-${params.YYYY}`;

  let parsedDate: Date;
  try {
    parsedDate = parse(monthParam, "MMMM-yyyy", new Date());
    if (!isValid(parsedDate)) {
      throw error(404, "Invalid date format");
    }
  } catch (e) {
    throw error(404, "Invalid date format");
  }

  const year = getYear(parsedDate);
  const currentDate = new Date();
  const maxDate = addMonths(currentDate, 12);
  const maxYear = getYear(maxDate);

  if (year < MIN_YEAR || year > maxYear) {
    throw error(404, "Date out of allowed range");
  }

  if (year === maxYear && parsedDate > maxDate) {
    throw error(404, "Date out of allowed range");
  }

  // Calculate month timestamps
  const monthStart = startOfMonth(parsedDate);
  const monthEnd = endOfMonth(parsedDate);
  const monthStartTs = getUnixTime(monthStart);
  const monthEndTs = getUnixTime(monthEnd) + 86399; // End of the last day

  // Fetch page with monitors for the root path (default status page)
  const pageData = await GetPageByPathWithMonitors("/");
  if (!pageData) {
    throw error(404, "Page Not Found");
  }

  return {
    monthParam,
    monthStartTs,
    monthEndTs,
    localTz,
  };
};

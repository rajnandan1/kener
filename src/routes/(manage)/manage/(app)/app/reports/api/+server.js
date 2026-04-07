// @ts-nocheck
import { json } from "@sveltejs/kit";
import { GenerateDowntimeReport, ExportReportToCSV } from "$lib/server/controllers/reports.js";
import { IsLoggedInSession } from "$lib/server/controllers/controller.js";

export async function POST({ request, cookies }) {
  let isLoggedIn = await IsLoggedInSession(cookies);
  if (!!isLoggedIn.error) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const { monitor_tag, startTimestamp, endTimestamp, format } = await request.json();

  if (!monitor_tag || !startTimestamp || !endTimestamp) {
    return json({ error: "Missing required parameters" }, { status: 400 });
  }

  // Validate timestamps
  if (startTimestamp >= endTimestamp) {
    return json({ error: "Start timestamp must be before end timestamp" }, { status: 400 });
  }

  try {
    const report = await GenerateDowntimeReport(monitor_tag, startTimestamp, endTimestamp);

    if (format === "csv") {
      const csvData = ExportReportToCSV(report);
      return json({ csvData, report });
    }

    return json({ report });
  } catch (error) {
    console.error("Error generating report:", error);
    return json({ error: error.message }, { status: 500 });
  }
}

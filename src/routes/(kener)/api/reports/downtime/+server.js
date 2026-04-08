// @ts-nocheck
import { json } from "@sveltejs/kit";
import { auth } from "$lib/server/webhook.js";
import { GenerateDowntimeReport } from "$lib/server/controllers/reports.js";

export async function GET({ request, url }) {
  const startTime = Date.now();

  // Authenticate request
  const authError = await auth(request);
  if (authError !== null) {
    return json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: authError.message,
        },
      },
      { status: 401 }
    );
  }

  // Extract query parameters
  const query = url.searchParams;
  const tag = query.get("tag");
  const start = query.get("start");
  const end = query.get("end");
  const format = query.get("format") || "json";

  // Validate required parameters
  if (!tag || !start || !end) {
    return json(
      {
        success: false,
        error: {
          code: "MISSING_PARAMETERS",
          message: "Missing required parameters: tag, start, end",
        },
      },
      { status: 400 }
    );
  }

  // Parse and validate timestamps
  const startTimestamp = parseInt(start);
  const endTimestamp = parseInt(end);

  if (isNaN(startTimestamp) || isNaN(endTimestamp)) {
    return json(
      {
        success: false,
        error: {
          code: "INVALID_PARAMETERS",
          message: "Start and end must be valid Unix timestamps",
        },
      },
      { status: 400 }
    );
  }

  if (startTimestamp >= endTimestamp) {
    return json(
      {
        success: false,
        error: {
          code: "INVALID_DATE_RANGE",
          message: "Start timestamp must be before end timestamp",
        },
      },
      { status: 400 }
    );
  }

  // Generate report
  try {
    const report = await GenerateDowntimeReport(tag, startTimestamp, endTimestamp);

    const processingTime = Date.now() - startTime;

    // Format response based on requested format
    if (format === "summary") {
      return json(
        {
          success: true,
          data: {
            monitor: report.monitor,
            period: {
              start: report.period.start,
              end: report.period.end,
            },
            summary: report.summary,
          },
        },
        { status: 200 }
      );
    }

    // Full JSON response (default)
    return json(
      {
        success: true,
        data: {
          monitor: report.monitor,
          period: {
            ...report.period,
            durationHours: parseFloat(((endTimestamp - startTimestamp) / 3600).toFixed(2)),
          },
          summary: report.summary,
          downtimes: report.downtimes.map((d) => ({
            ...d,
            startTimestamp: Math.floor(new Date(d.startDateTime).getTime() / 1000),
            endTimestamp: Math.floor(new Date(d.endDateTime).getTime() / 1000),
          })),
        },
        meta: {
          requestedAt: Math.floor(Date.now() / 1000),
          processingTimeMs: processingTime,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error generating downtime report:", error);

    // Check if monitor not found
    if (error.message.includes("not found")) {
      return json(
        {
          success: false,
          error: {
            code: "MONITOR_NOT_FOUND",
            message: error.message,
          },
        },
        { status: 404 }
      );
    }

    // Generic error
    return json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message,
        },
      },
      { status: 500 }
    );
  }
}

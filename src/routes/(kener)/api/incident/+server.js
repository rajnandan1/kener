// @ts-nocheck
// @ts-ignore
import { json } from "@sveltejs/kit";
import { auth } from "$lib/server/webhook";
import { CreateIncident, ParseIncidentToAPIResp } from "$lib/server/controllers/controller";
import db from "$lib/server/db/db.js";

export async function POST({ request }) {
  const payload = await request.json();
  const authError = await auth(request);
  if (authError !== null) {
    return json(
      { error: authError.message },
      {
        status: 401,
      },
    );
  }

  let incident = {
    title: payload.title,
    start_date_time: payload.start_date_time,
    incident_source: "API",
  };

  try {
    let incidentDb = await CreateIncident(incident);
    return json(await ParseIncidentToAPIResp(incidentDb.incident_id), {
      status: 201,
    });
  } catch (e) {
    return json(
      { error: e.message },
      {
        status: 400,
      },
    );
  }
}

export async function GET({ request, url }) {
  const authError = await auth(request);

  if (authError !== null) {
    return json(
      { error: authError.message },
      {
        status: 401,
      },
    );
  }
  let filter = {
    status: url.searchParams.get("status") || "OPEN",
  };

  if (!!url.searchParams.get("start_date_time")) {
    filter.start = url.searchParams.get("start_date_time");
  }

  if (!!url.searchParams.get("end_date_time")) {
    filter.end = url.searchParams.get("end_date_time");
  }
  if (!!url.searchParams.get("state")) {
    filter.state = url.searchParams.get("state");
  }

  let page = url.searchParams.get("page") || 1;
  let limit = url.searchParams.get("limit") || 10;

  let incidents = await db.getIncidentsPaginatedDesc(page, limit, filter);
  return json(incidents, {
    status: 200,
  });
}

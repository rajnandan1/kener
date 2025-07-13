// @ts-nocheck
// @ts-ignore
import { CreateMonitor, GetMonitors } from "$lib/server/controllers/controller.js";
import { auth } from "$lib/server/webhook";
import { json } from "@sveltejs/kit";

export async function GET({ request, url }) {
  const authError = await auth(request);
  if (authError !== null) {
    return json({ error: authError.message }, { status: 401 });
  }

  let data = {};
  const query = url.searchParams;
  const tag = query.get("tag");
  if (tag) {
    data = { tag };
  }

  let resp;
  try {
    resp = await GetMonitors(data);
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
  return json(resp, { status: 200 });
}

export async function POST({ request }) {
  const payload = await request.json();
  const authError = await auth(request);
  if (authError !== null) {
    return json({ error: authError.message }, { status: 401 });
  }

  if (payload.id) {
    return json({ error: "monitor id must be empty or 0" }, { status: 400 });
  }

  payload.enable_details_to_be_examined =
    typeof payload.enable_details_to_be_examined === "boolean" ? payload.enable_details_to_be_examined : true;

  payload.enable_individual_view_if_grouped =
    typeof payload.enable_individual_view_if_grouped === "boolean" ? payload.enable_individual_view_if_grouped : true;

  try {
    await CreateMonitor(payload);
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }

  let resp;
  try {
    resp = await GetMonitors({ tag: payload.tag });
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
  return json(resp[0], { status: 201 });
}

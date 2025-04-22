// @ts-nocheck
// @ts-ignore
import { json } from "@sveltejs/kit";
import { auth } from "$lib/server/webhook";
import { CreateMonitor, GetMonitors } from "$lib/server/controllers/controller.js";

export async function GET({ request, url }) {
  const authError = await auth(request);
  if (authError !== null) {
    return json({ error: authError.message }, { status: 401 });
  }

  let data = {};
  const query = url.searchParams;
  const tag = query.get("tag");
  if (tag) {
    data = {
      tag: tag,
    };
  }

  let resp;
  try {
    resp = await GetMonitors(data);
  } catch (error) {
    resp = { error: error.message };
    return json(resp, { status: 500 });
  }
  return json(resp, { status: 200 });
}

export async function POST({ request }) {
  const payload = await request.json();
  const authError = await auth(request);
  if (authError !== null) {
    return json({ error: authError.message }, { status: 401 });
  }

  try {
    await CreateMonitor(payload);
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }

  let resp;
  try {
    resp = await GetMonitors({ tag: payload.tag });
  } catch (error) {
    resp = { error: error.message };
    return json(resp, { status: 500 });
  }
  return json(resp[0], { status: 201 });
}

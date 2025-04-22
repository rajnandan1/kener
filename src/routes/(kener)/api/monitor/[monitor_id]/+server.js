// @ts-nocheck
// @ts-ignore
import { json } from "@sveltejs/kit";
import { auth } from "$lib/server/webhook";
import { DeleteMonitorCompletelyUsingTag, GetMonitors, UpdateMonitor } from "$lib/server/controllers/controller";

export async function GET({ request, params }) {
  const authError = await auth(request);
  if (authError !== null) {
    return json({ error: authError.message }, { status: 401 });
  }

  const id = params.monitor_id;
  if (!!!id) {
    return json({ error: "id missing" }, { status: 400 });
  }

  let resp;
  try {
    resp = await GetMonitors({ id: id });
  } catch (error) {
    resp = { error: error.message };
    return json(resp, { status: 500 });
  }

  if (resp.length === 0) {
    return json({ error: "monitor does not exist" }, { status: 404 });
  }
  return json(resp[0], { status: 200 });
}

export async function PUT({ request, params }) {
  const payload = await request.json();
  const authError = await auth(request);
  if (authError !== null) {
    return json({ error: authError.message }, { status: 401 });
  }

  const id = params.monitor_id;
  if (!!!id) {
    return json({ error: "id missing" }, { status: 400 });
  }

  if (`${payload.id}` !== `${id}`) {
    return json({ error: `id mismatch: payload: ${payload.id}, url: ${id}` }, { status: 400 });
  }

  try {
    await UpdateMonitor(payload);
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
  return json(resp[0], { status: 200 });
}

export async function DELETE({ request, params }) {
  const authError = await auth(request);
  if (authError !== null) {
    return json({ error: authError.message }, { status: 401 });
  }

  const id = params.monitor_id;
  if (!!!id) {
    return json({ error: "id missing" }, { status: 400 });
  }

  let resp;
  try {
    resp = await GetMonitors({ id: id });
  } catch (error) {
    resp = { error: error.message };
    return json(resp, { status: 500 });
  }

  if (resp.length === 0) {
    return json({ error: "monitor does not exist" }, { status: 404 });
  }

  try {
    resp = await DeleteMonitorCompletelyUsingTag(resp[0].tag);
  } catch (error) {
    resp = { error: error.message };
    return json(resp, { status: 500 });
  }
  return json({}, { status: 200 });
}

// @ts-nocheck
// @ts-ignore
import { SubscribeToIncidentID, UnsubscribeBySubscriberToken } from "$lib/server/controllers/controller";
import { json } from "@sveltejs/kit";

export async function POST({ request }) {
  const payload = await request.json();
  let action = payload.action;
  let data = payload.data || {};
  let resp = {};

  try {
    if (action == "UnsubscribeBySubscriberToken") {
      resp = await UnsubscribeBySubscriberToken(data);
    }
  } catch (error) {
    resp = { error: error.message };
    return json(resp, { status: 500 });
  }
  return json(resp, {
    status: 200,
  });
}

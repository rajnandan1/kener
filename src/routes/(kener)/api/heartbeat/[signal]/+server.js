// @ts-nocheck
// @ts-ignore
import { json } from "@sveltejs/kit";
import { RegisterHeartbeat } from "$lib/server/controllers/controller";

export async function GET({ request, params }) {
  let signal = params.signal;
  let signalData = signal.split(":");
  if (signalData.length != 2) {
    return json({ error: "Invalid url" }, { status: 400 });
  }
  let resp = await RegisterHeartbeat(signalData[0], signalData[1]);
  if (!!!resp) {
    return json({ error: "Invalid heartbeat url" }, { status: 400 });
  }
  return json(
    { status: "OK" },
    {
      status: 200,
    },
  );
}
export async function POST({ request, params }) {
  let signal = params.signal;
  let signalData = signal.split(":");
  if (signalData.length != 2) {
    return json({ error: "Invalid url" }, { status: 400 });
  }
  let resp = await RegisterHeartbeat(signalData[0], signalData[1]);
  if (!!!resp) {
    return json({ error: "Invalid heartbeat url" }, { status: 400 });
  }
  return json(
    { status: "OK" },
    {
      status: 200,
    },
  );
}

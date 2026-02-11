import { json, type RequestHandler } from "@sveltejs/kit";
import GC from "$lib/global-constants";
import { RegisterHeartbeat } from "$lib/server/controllers/monitorsController";
export const POST: RequestHandler = async ({ request, params }) => {
  const { tag, secret } = params;
  if (!tag || !secret) {
    return json({ error: "Tag and secret are required" }, { status: 400 });
  }
  try {
    let m = await RegisterHeartbeat(tag, secret);
    return json({
      status: m,
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
};

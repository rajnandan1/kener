import { json, type RequestHandler } from "@sveltejs/kit";
import { RegisterHeartbeat } from "$lib/server/controllers/monitorsController";

const handler: RequestHandler = async ({ params }) => {
  const { tag, secret } = params;

  if (!tag || !secret) {
    return json({ error: "Tag and secret are required" }, { status: 400 });
  }

  try {
    const status = await RegisterHeartbeat(tag, secret);
    return json({ status });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
};

export const GET = handler;
export const POST = handler;

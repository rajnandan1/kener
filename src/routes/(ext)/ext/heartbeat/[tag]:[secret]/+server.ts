import { json, type RequestHandler } from "@sveltejs/kit";
import GC from "$lib/global-constants";
import { RegisterHeartbeat } from "$lib/server/controllers/monitorsController";
export const POST: RequestHandler = async ({ request, params }) => {
  const { tag, secret } = params;
  return json({
    tag,
    secret,
  });
};

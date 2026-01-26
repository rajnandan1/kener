import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";

const validMethods = ["email", "webhook", "slack", "discord"];

export const load: PageServerLoad = async ({ params }) => {
  const { method, id } = params;

  if (!validMethods.includes(method)) {
    throw error(404, "Invalid method");
  }

  const subscriberId = parseInt(id, 10);
  if (isNaN(subscriberId)) {
    throw error(404, "Invalid subscriber ID");
  }

  return {
    method,
    subscriberId,
  };
};

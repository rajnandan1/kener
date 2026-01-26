import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";

const validMethods = ["email", "webhook", "slack", "discord"];

export const load: PageServerLoad = async ({ params }) => {
  const { method } = params;

  if (!validMethods.includes(method)) {
    throw error(404, "Invalid method");
  }

  return {
    method,
  };
};

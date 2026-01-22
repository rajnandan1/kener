import type { PageServerLoad } from "./$types";
import { IsEmailSetup } from "$lib/server/controllers/emailController.js";

export const load: PageServerLoad = async () => {
  const canSendEmail = IsEmailSetup();
  return {
    canSendEmail,
  };
};

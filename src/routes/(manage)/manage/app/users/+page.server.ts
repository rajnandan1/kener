import type { PageServerLoad } from "./$types";
import { IsEmailSetup } from "$lib/server/controllers/emailController.js";
import { IsLoggedInSession } from "$lib/server/controllers/userController.js";

export const load: PageServerLoad = async ({ cookies }) => {
  const canSendEmail = IsEmailSetup();
  const session = await IsLoggedInSession(cookies);

  return {
    canSendEmail,
    user: session.user || null,
  };
};

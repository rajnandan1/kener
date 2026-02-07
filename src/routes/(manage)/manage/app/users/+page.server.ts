import type { PageServerLoad } from "./$types";
import { IsEmailSetup } from "$lib/server/controllers/emailController.js";
import { GetLoggedInSession } from "$lib/server/controllers/userController.js";

export const load: PageServerLoad = async ({ cookies }) => {
  const canSendEmail = IsEmailSetup();
  const loggedInUser = await GetLoggedInSession(cookies);

  return {
    canSendEmail,
    user: loggedInUser || null,
  };
};

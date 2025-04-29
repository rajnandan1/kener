import { IsEmailSetup } from "$lib/server/controllers/controller.js";

export async function load({ parent }) {
  let canSendEmail = IsEmailSetup();
  return {
    canSendEmail,
  };
}

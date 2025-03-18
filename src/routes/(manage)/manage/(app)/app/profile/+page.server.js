// @ts-nocheck

import { IsEmailSetup, CheckInvitationExists } from "$lib/server/controllers/controller.js";
import { INVITE_VERIFY_EMAIL } from "$lib/server/constants.js";

export async function load({ parent }) {
  let canSendEmail = await IsEmailSetup();
  const parentData = await parent();
  return {
    canSendEmail,
    activeInvitationExists: await CheckInvitationExists(parentData.user.id, INVITE_VERIFY_EMAIL),
  };
}

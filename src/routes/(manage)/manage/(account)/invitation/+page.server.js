// @ts-nocheck

import {
  GetActiveInvitationByToken,
  UpdateUserData,
  UpdateInvitationStatusToAccepted,
} from "$lib/server/controllers/controller.js";
import { INVITE_VERIFY_EMAIL } from "$lib/server/constants.js";

export async function load({ parent, url }) {
  const query = url.searchParams;
  const invitation_token = query.get("token");
  let invite = await GetActiveInvitationByToken(invitation_token);
  let header = "Error";
  let message = "Invalid Invitation Token. The invitation token is invalid or expired.";
  let error = true;
  if (!!invite) {
    if (invite.invitation_type === INVITE_VERIFY_EMAIL) {
      let updateData = {
        userID: invite.invited_user_id,
        updateKey: "is_verified",
        updateValue: 1,
      };
      try {
        let updateResp = await UpdateUserData(updateData);
        let updateInvitationResp = await UpdateInvitationStatusToAccepted(invitation_token);
        error = false;
        header = "Email Verified Successfully";
        message = "Thanks for verifying your email";
      } catch (e) {
        console.error(e);
      }
    }
  }
  return {
    error: error,
    message: message,
    header: header,
  };
}

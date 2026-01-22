import db from "../db/db.js";
import crypto from "crypto";
import { MaskString, CreateHash } from "./commonController.js";
import type { InvitationRecord, InvitationRecordInsert } from "../types/db.js";

interface InvitationInput {
  invitation_type: string;
  invited_user_id: number;
  invited_by_user_id: number;
  invitation_meta?: string;
  invitation_expiry: Date;
}

export const CreateNewInvitation = async (data: InvitationInput): Promise<{ invitation_token: string }> => {
  //create a token
  let token = crypto.randomBytes(32).toString("hex");
  let hashedToken = CreateHash(token);
  let invitation_token = data.invitation_type.toLowerCase() + "_" + hashedToken;

  let invite: InvitationRecordInsert = {
    invitation_token: invitation_token,
    invitation_type: data.invitation_type,
    invited_user_id: data.invited_user_id,
    invited_by_user_id: data.invited_by_user_id,
    invitation_meta: data.invitation_meta,
    invitation_expiry: data.invitation_expiry,
    invitation_status: "PENDING",
  };

  //update old invitations to VOID
  if (invite.invited_user_id) {
    await db.updateInvitationStatusToVoid(invite.invited_user_id, invite.invitation_type);
  }

  let res = await db.insertInvitation(invite);
  return {
    invitation_token,
  };
};

//check if there is a row for given invited_user_id,invitation_type and invitation_status = PENDING
export const CheckInvitationExists = async (invited_user_id: number, invitation_type: string): Promise<boolean> => {
  let invitation = await db.invitationExists(invited_user_id, invitation_type);
  return !!invitation;
};

//getInvitationByToken
export const GetActiveInvitationByToken = async (invitation_token: string): Promise<InvitationRecord | undefined> => {
  let invitation = await db.getActiveInvitationByToken(invitation_token);
  return invitation;
};

//updateInvitationStatusToAccepted
export const UpdateInvitationStatusToAccepted = async (invitation_token: string): Promise<number> => {
  return await db.updateInvitationStatusToAccepted(invitation_token);
};

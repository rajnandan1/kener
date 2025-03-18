// @ts-nocheck

import { IsEmailSetup, GetAllUsersPaginated, GetTotalUserPages } from "$lib/server/controllers/controller.js";
import { INVITE_VERIFY_EMAIL } from "$lib/server/constants.js";

export async function load({ parent, url }) {
  let canSendEmail = await IsEmailSetup();
  const parentData = await parent();
  const query = url.searchParams;
  const page = query.get("page") || 1;
  const limit = query.get("limit") || 10;
  return {
    canSendEmail,
    users: await GetAllUsersPaginated({
      page: parseInt(page),
      limit: parseInt(limit),
    }),
    page: parseInt(page),
    limit: parseInt(limit),
    total: await GetTotalUserPages(limit),
  };
}

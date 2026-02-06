import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import { resolve } from "$app/paths";
import { GetLayoutServerData } from "$lib/server/controllers/layoutController";
import serverResolve from "$lib/server/resolver.js";

export const load: LayoutServerLoad = async ({ cookies, request }) => {
  const data = await GetLayoutServerData(cookies, request);

  if (!data.isSetupComplete) {
    throw redirect(302, serverResolve(`/account/signin`));
  }

  return data;
};

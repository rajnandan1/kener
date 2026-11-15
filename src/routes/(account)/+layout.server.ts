import { resolveAdminLocale } from "$lib/admin-i18n/messages";
import type { LayoutServerLoad } from "./$types";
import { GetLayoutServerData } from "$lib/server/controllers/layoutController";

export const load: LayoutServerLoad = async ({ cookies, request }) => {
  return {
    ...(await GetLayoutServerData(cookies, request)),
    adminLocale: resolveAdminLocale(cookies.get("kener_admin_locale"), request.headers.get("accept-language")),
  };
};

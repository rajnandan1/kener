import { base } from "$app/paths";
import type { LayoutServerLoad } from "./$types";
import { resolveAdminLocale } from "$lib/admin-i18n/messages";

/** Keep the administrative error boundary localizable even if a group layout fails. */
export const load: LayoutServerLoad = ({ cookies, request, url }) => {
  const pathname = url.pathname.slice(base.length);
  const isAdminRoute = /^\/(manage|account)(\/|$)/.test(pathname);
  return {
    adminLocale: isAdminRoute
      ? resolveAdminLocale(cookies.get("kener_admin_locale"), request.headers.get("accept-language"))
      : null,
  };
};

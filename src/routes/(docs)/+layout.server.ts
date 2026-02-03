import MobileDetect from "mobile-detect";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ cookies, request, url }) => {
  const userAgent = request.headers.get("user-agent") ?? "";
  const md = new MobileDetect(userAgent);
  const isMobile = !!md.mobile();
  return {
    isMobile,
  };
};

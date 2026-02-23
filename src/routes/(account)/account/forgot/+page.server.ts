import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url }) => {
  const view = url.searchParams.get("view") || "request_reset";
  const token = url.searchParams.get("token") || "";

  return {
    view,
    token,
  };
};

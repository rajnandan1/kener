import type { LayoutServerLoad } from "./$types";
import { getDocsConfig } from "./docs-utils.server";

export const load: LayoutServerLoad = async ({ params, url, parent }) => {
  const parentData = await parent();
  const config = getDocsConfig();

  // Extract slug from URL path
  const pathParts = url.pathname.split("/docs/");
  const currentSlug = pathParts[1] || "";

  return {
    config,
    currentSlug,
    isMobile: parentData.isMobile,
  };
};

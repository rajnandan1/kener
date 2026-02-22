import type { LayoutServerLoad } from "./$types";
import { getDocsConfig, resolvePageSlugForConfig, resolveVersionedDocsSlug } from "./docs-utils.server";

export const load: LayoutServerLoad = async ({ params, url, parent }) => {
  const parentData = await parent();

  // Extract slug from URL path
  const pathParts = url.pathname.split("/docs/");
  const pathAfterDocs = pathParts[1] || "";
  const { versionSlug, pageSlug } = resolveVersionedDocsSlug(pathAfterDocs);
  const requestedTab = url.searchParams.get("tab") ?? undefined;

  const requestedVersion = versionSlug;
  const config = getDocsConfig(requestedVersion, requestedTab, pageSlug);
  const currentSlug = resolvePageSlugForConfig(pageSlug, config, requestedVersion) ?? pageSlug;

  return {
    config,
    currentSlug,
    isMobile: parentData.isMobile,
  };
};

import type { PageServerLoad } from "./$types";
import {
  getDocsPageData,
  extractTableOfContents,
  docExists,
  getDocsConfig,
  getFirstPageSlug,
  resolvePageSlugForConfig,
  resolveVersionedDocsSlug,
} from "../../docs-utils.server";
import { error, redirect } from "@sveltejs/kit";
import mdToHTML from "$lib/marked";

export const load: PageServerLoad = async ({ params }) => {
  const { versionSlug, pageSlug } = resolveVersionedDocsSlug(params.slug);

  if (!versionSlug) {
    throw error(404, {
      message: "Documentation page not found",
    });
  }

  const requestedVersion = versionSlug;
  const config = getDocsConfig(requestedVersion, undefined, pageSlug);
  const slug = resolvePageSlugForConfig(pageSlug, config, requestedVersion);

  if (!pageSlug) {
    const firstPageSlug = getFirstPageSlug(config);
    if (firstPageSlug) {
      const normalizedFirstPageSlug =
        config.activeVersion && firstPageSlug.startsWith(`${config.activeVersion}/`)
          ? firstPageSlug.slice(config.activeVersion.length + 1)
          : firstPageSlug;
      const versionPrefix = config.activeVersion ? `/${config.activeVersion}` : "";
      throw redirect(302, `/docs${versionPrefix}/${normalizedFirstPageSlug}`);
    }
  }

  // Check if the doc exists
  if (!slug || !docExists(slug, config)) {
    throw error(404, {
      message: "Documentation page not found",
    });
  }

  const pageData = getDocsPageData(slug, config);

  if (!pageData) {
    throw error(404, {
      message: "Documentation page not found",
    });
  }

  // Convert markdown to HTML (heading IDs are added by marked-gfm-heading-id)
  const htmlContent = mdToHTML(pageData.content);

  // Extract table of contents
  const tableOfContents = extractTableOfContents(htmlContent);

  return {
    ...pageData,
    htmlContent,
    tableOfContents,
  };
};

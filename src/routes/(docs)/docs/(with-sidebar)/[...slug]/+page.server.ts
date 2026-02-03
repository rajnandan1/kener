import type { PageServerLoad } from "./$types";
import { getDocsPageData, extractTableOfContents, docExists } from "../../docs-utils.server";
import { error } from "@sveltejs/kit";
import mdToHTML from "$lib/marked";

export const load: PageServerLoad = async ({ params }) => {
  const slug = params.slug;

  // Check if the doc exists
  if (!docExists(slug)) {
    throw error(404, {
      message: "Documentation page not found",
    });
  }

  const pageData = getDocsPageData(slug);

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

import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";

import {
  getRawMarkdownContent,
  docExists,
  getDocsConfig,
  resolvePageSlugForConfig,
  resolveVersionedDocsSlug,
} from "../../docs-utils.server.js";

export const GET: RequestHandler = async ({ params }) => {
  const { versionSlug, pageSlug } = resolveVersionedDocsSlug(params.slug);

  if (!versionSlug) {
    throw error(404, "Document not found");
  }

  const requestedVersion = versionSlug;
  const config = getDocsConfig(requestedVersion);

  const resolvedSlug = resolvePageSlugForConfig(pageSlug, config, requestedVersion);

  if (!resolvedSlug || !docExists(resolvedSlug, config)) {
    throw error(404, "Document not found");
  }

  const content = getRawMarkdownContent(resolvedSlug);

  if (!content) {
    throw error(404, "Document not found");
  }

  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `inline; filename="${resolvedSlug.split("/").pop()}.md"`,
    },
  });
};

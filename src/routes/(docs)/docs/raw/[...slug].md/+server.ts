import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";

import { getRawMarkdownContent, docExists } from "../../docs-utils.server.js";

export const GET: RequestHandler = async ({ params }) => {
  const slug = params.slug;

  if (!slug || !docExists(slug)) {
    throw error(404, "Document not found");
  }

  const content = getRawMarkdownContent(slug);

  if (!content) {
    throw error(404, "Document not found");
  }

  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `inline; filename="${slug.split("/").pop()}.md"`,
    },
  });
};

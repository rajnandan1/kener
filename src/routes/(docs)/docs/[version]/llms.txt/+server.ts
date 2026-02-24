import { error, type RequestHandler } from "@sveltejs/kit";
import { getDocsVersionBySlug, getVersionDocsLlmEntries } from "../../docs-utils.server";

const LLM_BASE_DOMAIN = "https://kener.ing";

export const GET: RequestHandler = ({ params }) => {
  const versionSlug = params.version;

  if (!versionSlug) {
    throw error(404, "Docs version not found");
  }

  const version = getDocsVersionBySlug(versionSlug);

  if (!version) {
    throw error(404, "Docs version not found");
  }

  const entries = getVersionDocsLlmEntries(versionSlug, LLM_BASE_DOMAIN);

  const lines = [
    "# Kener",
    "",
    "## Docs",
    "",
    ...entries.map((entry) => {
      if (!entry.description) {
        return `- [${entry.title}](${entry.url})`;
      }

      return `- [${entry.title}](${entry.url}): ${entry.description}`;
    }),
  ];

  const body = lines.join("\n");

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
};

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { searchDocs } from "$lib/server/docs-search";

export const GET: RequestHandler = async ({ url }) => {
  const query = url.searchParams.get("q") || "";

  if (query.trim().length < 2) {
    return json({ results: [] });
  }

  try {
    const results = await searchDocs(query, 10);
    return json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return json({ results: [], error: "Search failed" }, { status: 500 });
  }
};

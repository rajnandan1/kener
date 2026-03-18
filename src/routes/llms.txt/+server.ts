import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getDocsRootConfig } from "../(docs)/docs/docs-utils.server";

export const GET: RequestHandler = () => {
  const rootConfig = getDocsRootConfig();
  const latestVersion = rootConfig.versions.find((v) => v.latest) ?? rootConfig.versions[0];
  const versionSlug = latestVersion?.slug ?? "v4";

  throw redirect(301, `/docs/${versionSlug}/llms.txt`);
};

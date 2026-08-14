import { json, type RequestHandler } from "@sveltejs/kit";
import db from "$lib/server/db/db";
import type { UploadPageLogoRequest, UploadPageLogoResponse } from "$lib/types/api";
import { uploadImage } from "../../../../../../(manage)/manage/api/+server";

export const POST: RequestHandler = async ({ locals, request }) => {
  const page = locals.page;

  if (!page) {
    return json({ error: { code: "NOT_FOUND", message: "Page not found" } }, { status: 404 });
  }

  let body: Partial<UploadPageLogoRequest>;
  try {
    body = await request.json();
  } catch {
    return json({ error: { code: "BAD_REQUEST", message: "Invalid JSON body" } }, { status: 400 });
  }

  if (typeof body.base64 !== "string" || typeof body.mime_type !== "string") {
    return json({ error: { code: "BAD_REQUEST", message: "base64 and mime_type are required strings" } }, { status: 400 });
  }

  try {
    const image = await uploadImage({
      base64: body.base64,
      mimeType: body.mime_type,
      fileName: typeof body.file_name === "string" ? body.file_name : undefined,
      maxWidth: 256,
      maxHeight: 256,
      prefix: "page_logo_",
    });
    await db.updatePage(page.id, { page_logo: image.url });
    const response: UploadPageLogoResponse = { page_logo: image.url };
    return json(response);
  } catch (error) {
    return json(
      { error: { code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Failed to upload page logo" } },
      { status: 400 },
    );
  }
};

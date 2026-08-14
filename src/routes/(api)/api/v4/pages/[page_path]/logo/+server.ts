import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import db from "$lib/server/db/db";
import type { UploadPageLogoRequest, UploadPageLogoResponse } from "$lib/types/api";
import { uploadImage } from "../../../../../../(manage)/manage/api/+server";

export const POST: RequestHandler = async ({ locals, request }) => {
  const page = locals.page;

  if (!page) {
    return json({ error: { code: "NOT_FOUND", message: "Page not found" } }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: { code: "BAD_REQUEST", message: "Invalid JSON body" } }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json({ error: { code: "BAD_REQUEST", message: "Request body must be an object" } }, { status: 400 });
  }

  const data = body as Partial<UploadPageLogoRequest>;
  if (Object.keys(data).some((key) => !["base64", "mime_type", "file_name"].includes(key))) {
    return json({ error: { code: "BAD_REQUEST", message: "Unexpected request field" } }, { status: 400 });
  }

  if (typeof data.base64 !== "string" || typeof data.mime_type !== "string") {
    return json({ error: { code: "BAD_REQUEST", message: "base64 and mime_type are required strings" } }, { status: 400 });
  }

  if (data.file_name !== undefined && typeof data.file_name !== "string") {
    return json({ error: { code: "BAD_REQUEST", message: "file_name must be a string" } }, { status: 400 });
  }

  let image: Awaited<ReturnType<typeof uploadImage>>;
  try {
    image = await uploadImage({
      base64: data.base64,
      mimeType: data.mime_type,
      fileName: data.file_name,
      maxWidth: 256,
      maxHeight: 256,
      prefix: "page_logo_",
    });
  } catch (error) {
    return json(
      { error: { code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Failed to upload page logo" } },
      { status: 400 },
    );
  }

  try {
    if ((await db.updatePage(page.id, { page_logo: image.url })) === 0) {
      await db.deleteImage(image.id).catch(() => undefined);
      return json({ error: { code: "NOT_FOUND", message: "Page not found" } }, { status: 404 });
    }
  } catch {
    await db.deleteImage(image.id).catch(() => undefined);
    return json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to save page logo" } }, { status: 500 });
  }

  const response: UploadPageLogoResponse = { page_logo: image.url };
  return json(response);
};

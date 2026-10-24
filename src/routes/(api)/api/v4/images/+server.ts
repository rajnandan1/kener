import { json, type RequestHandler } from "@sveltejs/kit";
import type { BadRequestResponse, UploadImageRequest, UploadImageResponse } from "$lib/types/api";
import { ImageUploadError, uploadImage } from "$lib/server/controllers/imageController";
import GC from "$lib/global-constants";

function badRequest(message: string): Response {
  const errorResponse: BadRequestResponse = { error: { code: "BAD_REQUEST", message } };
  return json(errorResponse, { status: 400 });
}

export const POST: RequestHandler = async ({ request }) => {
  let body: UploadImageRequest;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (typeof body?.base64 !== "string") {
    return badRequest("base64 is required and must be a string");
  }
  if (typeof body.mime_type !== "string") {
    return badRequest("mime_type is required and must be a string");
  }
  if (body.file_name !== undefined && typeof body.file_name !== "string") {
    return badRequest("file_name must be a string");
  }
  for (const key of ["max_width", "max_height"] as const) {
    const size = body[key];
    if (size !== undefined && !(Number.isInteger(size) && size > 0 && size <= GC.MAX_IMAGE_DIMENSION)) {
      return badRequest(`${key} must be an integer from 1 to ${GC.MAX_IMAGE_DIMENSION}`);
    }
  }
  if (body.force_dimensions !== undefined && typeof body.force_dimensions !== "boolean") {
    return badRequest("force_dimensions must be a boolean");
  }

  try {
    const image = await uploadImage({
      base64: body.base64,
      mimeType: body.mime_type,
      fileName: body.file_name,
      maxWidth: body.max_width,
      maxHeight: body.max_height,
      forceDimensions: body.force_dimensions,
    });
    const response: UploadImageResponse = { image };
    return json(response, { status: 201 });
  } catch (err) {
    if (err instanceof ImageUploadError) return badRequest(err.message);
    console.error("POST /api/v4/images failed:", err);
    return json({ error: { code: "INTERNAL_ERROR", message: "Failed to upload image" } }, { status: 500 });
  }
};

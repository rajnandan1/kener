import sharp from "sharp";
import { createHash } from "node:crypto";
import heicConvert from "heic-convert";
import GC from "../../global-constants.js";
import db from "../db/db.js";

/** An upload the client must fix: its message is safe to show to the client. */
export class ImageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageUploadError";
  }
}

function unreadable(): never {
  throw new ImageUploadError("Could not read image data");
}

export interface ImageUploadData {
  base64: string; // base64 encoded image data (without data URI prefix)
  mimeType: string;
  fileName?: string;
  maxWidth?: number;
  maxHeight?: number;
  forceDimensions?: boolean;
}

export async function uploadImage(data: ImageUploadData) {
  const { base64, mimeType, fileName, maxWidth, maxHeight, forceDimensions = false } = data;

  if (!base64) {
    throw new ImageUploadError("Image data is required");
  }

  const allowedMimeTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/heic", "image/heif"];
  if (!allowedMimeTypes.includes(mimeType)) {
    throw new ImageUploadError(`Invalid image type. Allowed types: ${allowedMimeTypes.join(", ")}`);
  }

  if (fileName && fileName.length > 255) {
    throw new ImageUploadError("File name must be 255 characters or fewer");
  }

  const imageBuffer = Buffer.from(base64, "base64");
  if (!imageBuffer.length) {
    throw new ImageUploadError("Invalid image data");
  }

  if (imageBuffer.length > GC.MAX_UPLOAD_BYTES) {
    throw new ImageUploadError(`Image is too large. Maximum upload size is ${GC.MAX_UPLOAD_BYTES / 1024 / 1024}MB`);
  }

  const normalizedRequestedMime = mimeType === "image/jpg" ? "image/jpeg" : mimeType;
  const maybeTextHeader = imageBuffer.subarray(0, 4096).toString("utf8");
  const looksLikeSvg = /<svg[\s>]/i.test(maybeTextHeader) || /<\?xml/i.test(maybeTextHeader);

  if (normalizedRequestedMime === "image/svg+xml" || looksLikeSvg) {
    throw new ImageUploadError("SVG uploads are not allowed");
  }

  // Pre-convert HEIC/HEIF to JPEG before passing to sharp (sharp may lack HEVC codec)
  let sharpInputBuffer = imageBuffer;
  const heicSignature = imageBuffer.subarray(4, 12).toString("ascii");
  const isHeicData = heicSignature.includes("ftyp");
  if (isHeicData) {
    const converted = await heicConvert({
      buffer: new Uint8Array(imageBuffer) as unknown as ArrayBuffer,
      format: "JPEG",
      quality: 0.85,
    }).catch(unreadable);
    sharpInputBuffer = Buffer.from(converted);
  }

  const image = sharp(sharpInputBuffer, { limitInputPixels: GC.MAX_INPUT_PIXELS });
  const metadata = await image.metadata().catch(unreadable);

  const formatToMime: Record<string, string> = {
    png: "image/png",
    jpeg: "image/jpeg",
    webp: "image/webp",
    svg: "image/svg+xml",
    heic: "image/heic",
    heif: "image/heif",
  };

  const detectedMimeType = metadata.format ? formatToMime[metadata.format] : undefined;
  if (!detectedMimeType) {
    throw new ImageUploadError("Could not detect a valid image format");
  }

  if (detectedMimeType === "image/svg+xml") {
    throw new ImageUploadError("SVG uploads are not allowed");
  }

  // HEIC/HEIF files often have .jpg extension (e.g. iPhone photos); allow the mismatch
  const isHeicDetected = detectedMimeType === "image/heic" || detectedMimeType === "image/heif";
  const isHeicRequested = normalizedRequestedMime === "image/heic" || normalizedRequestedMime === "image/heif";
  if (normalizedRequestedMime !== detectedMimeType && !isHeicDetected && !(isHeicData && isHeicRequested)) {
    throw new ImageUploadError("Image MIME type does not match file content");
  }

  const sourceWidth = metadata.width;
  const sourceHeight = metadata.height;
  if (!sourceWidth || !sourceHeight) {
    throw new ImageUploadError("Could not read image dimensions");
  }

  if (sourceWidth > GC.MAX_IMAGE_DIMENSION || sourceHeight > GC.MAX_IMAGE_DIMENSION) {
    throw new ImageUploadError(
      `Image dimensions exceed maximum allowed size of ${GC.MAX_IMAGE_DIMENSION}x${GC.MAX_IMAGE_DIMENSION}`,
    );
  }

  const resized = image.resize(
    Math.min(maxWidth ?? sourceWidth, GC.MAX_IMAGE_DIMENSION),
    Math.min(maxHeight ?? sourceHeight, GC.MAX_IMAGE_DIMENSION),
    { fit: forceDimensions ? "cover" : "inside", withoutEnlargement: !forceDimensions, position: "centre" },
  );

  const keepJpeg = detectedMimeType === "image/jpeg" || isHeicDetected;
  const { data: stored, info } = await (keepJpeg ? resized.jpeg({ quality: 85 }) : resized.png())
    .toBuffer({ resolveWithObject: true })
    .catch(unreadable);
  const record = {
    id: `${createHash("sha256").update(stored).digest("hex").slice(0, 16)}.${keepJpeg ? "jpg" : "png"}`,
    data: stored.toString("base64"),
    mime_type: keepJpeg ? "image/jpeg" : "image/png",
    original_name: fileName || null,
    width: info.width,
    height: info.height,
    size: stored.length,
  };
  await db.insertImage(record);

  const { id, data: _data, original_name: _originalName, ...details } = record;
  return { id, url: `/assets/images/${id}`, ...details };
}

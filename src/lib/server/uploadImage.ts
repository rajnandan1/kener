import sharp from "sharp";
import { nanoid } from "nanoid";
import db from "$lib/server/db/db";
import GC from "$lib/global-constants.js";
import type { ImageRecordInsert } from "$lib/server/types/db.js";
import heicConvert from "heic-convert";

export interface ImageUploadData {
  base64: string; // base64 encoded image data (without data URI prefix)
  mimeType: string;
  fileName?: string;
  maxWidth?: number;
  maxHeight?: number;
  forceDimensions?: boolean;
  prefix?: string; // prefix for the ID (e.g., "logo_", "favicon_")
  saveImage?: (image: ImageRecordInsert) => Promise<void>;
}

export async function uploadImage(data: ImageUploadData): Promise<{ id: string; url: string }> {
  const {
    base64,
    mimeType,
    fileName,
    maxWidth = 256,
    maxHeight = 256,
    forceDimensions = false,
    prefix = "img_",
  } = data;

  if (!base64) {
    throw new Error("Image data is required");
  }

  const allowedMimeTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/heic", "image/heif"];
  if (!allowedMimeTypes.includes(mimeType)) {
    throw new Error(`Invalid image type. Allowed types: ${allowedMimeTypes.join(", ")}`);
  }

  // Decode base64 to buffer
  const imageBuffer = Buffer.from(base64, "base64");
  if (!imageBuffer.length) {
    throw new Error("Invalid image data");
  }

  if (imageBuffer.length > GC.MAX_UPLOAD_BYTES) {
    throw new Error("Image is too large. Maximum upload size is 5MB");
  }

  const normalizedRequestedMime = mimeType === "image/jpg" ? "image/jpeg" : mimeType;
  const maybeTextHeader = imageBuffer.subarray(0, 4096).toString("utf8");
  const looksLikeSvg = /<svg[\s>]/i.test(maybeTextHeader) || /<\?xml/i.test(maybeTextHeader);

  if (normalizedRequestedMime === "image/svg+xml" || looksLikeSvg) {
    throw new Error("SVG uploads are not allowed");
  }

  let processedBuffer: Buffer;
  let finalMimeType = mimeType;
  let width: number | undefined;
  let height: number | undefined;

  // Pre-convert HEIC/HEIF to JPEG before passing to sharp (sharp may lack HEVC codec)
  let sharpInputBuffer = imageBuffer;
  const heicSignature = imageBuffer.subarray(4, 12).toString("ascii");
  const isHeicData = heicSignature.includes("ftyp");
  if (isHeicData) {
    const converted = await heicConvert({
      buffer: new Uint8Array(imageBuffer) as unknown as ArrayBuffer,
      format: "JPEG",
      quality: 0.85,
    });
    sharpInputBuffer = Buffer.from(converted);
  }

  // Process with sharp and normalize output
  const image = sharp(sharpInputBuffer, { limitInputPixels: GC.MAX_INPUT_PIXELS });
  const metadata = await image.metadata();

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
    throw new Error("Could not detect a valid image format");
  }

  if (detectedMimeType === "image/svg+xml") {
    throw new Error("SVG uploads are not allowed");
  }

  // HEIC/HEIF files often have .jpg extension (e.g. iPhone photos); allow the mismatch
  const isHeicDetected = detectedMimeType === "image/heic" || detectedMimeType === "image/heif";
  const isHeicRequested = normalizedRequestedMime === "image/heic" || normalizedRequestedMime === "image/heif";
  if (normalizedRequestedMime !== detectedMimeType && !isHeicDetected && !isHeicRequested) {
    throw new Error("Image MIME type does not match file content");
  }

  const sourceWidth = metadata.width || maxWidth;
  const sourceHeight = metadata.height || maxHeight;

  if (sourceWidth > GC.MAX_IMAGE_DIMENSION || sourceHeight > GC.MAX_IMAGE_DIMENSION) {
    throw new Error(
      `Image dimensions exceed maximum allowed size of ${GC.MAX_IMAGE_DIMENSION}x${GC.MAX_IMAGE_DIMENSION}`,
    );
  }

  const boundedMaxWidth = Math.min(maxWidth, GC.MAX_IMAGE_DIMENSION);
  const boundedMaxHeight = Math.min(maxHeight, GC.MAX_IMAGE_DIMENSION);

  // Calculate new dimensions.
  let newWidth = sourceWidth;
  let newHeight = sourceHeight;

  if (forceDimensions) {
    newWidth = Math.max(1, boundedMaxWidth);
    newHeight = Math.max(1, boundedMaxHeight);
  } else if (newWidth > boundedMaxWidth || newHeight > boundedMaxHeight) {
    const ratio = Math.min(boundedMaxWidth / newWidth, boundedMaxHeight / newHeight);
    newWidth = Math.max(1, Math.round(newWidth * ratio));
    newHeight = Math.max(1, Math.round(newHeight * ratio));
  }

  width = newWidth;
  height = newHeight;

  // Keep JPEG as JPEG; convert HEIC/HEIF to JPEG; convert everything else (WebP/PNG) to PNG.
  if (detectedMimeType === "image/jpeg" || isHeicDetected) {
    processedBuffer = await image
      .resize(newWidth, newHeight, {
        fit: forceDimensions ? "cover" : "inside",
        position: "centre",
      })
      .jpeg({ quality: 85 })
      .toBuffer();
    finalMimeType = "image/jpeg";
  } else {
    processedBuffer = await image
      .resize(newWidth, newHeight, {
        fit: forceDimensions ? "cover" : "inside",
        position: "centre",
      })
      .png()
      .toBuffer();
    finalMimeType = "image/png";
  }

  // Generate ID with nanoid and extension
  const fileExtension = finalMimeType === "image/jpeg" ? "jpg" : "png";
  const id = `${nanoid(16)}.${fileExtension}`;

  // Convert processed image back to base64
  const processedBase64 = processedBuffer.toString("base64");

  // Store in database
  const imageRecord: ImageRecordInsert = {
    id,
    data: processedBase64,
    mime_type: finalMimeType,
    original_name: fileName || null,
    width: width || null,
    height: height || null,
    size: processedBuffer.length,
  };
  await (data.saveImage ?? db.insertImage)(imageRecord);

  return {
    id,
    url: `/assets/images/${id}`,
  };
}

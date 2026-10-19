import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { randomBytes } from "node:crypto";

const { db } = vi.hoisted(() => ({
  db: { insertImage: vi.fn(async (row: { id: string; data: string }) => row.id) },
}));
vi.mock("$lib/server/db/db", () => ({ default: db }));

import { POST } from "./+server";

const png = async (width: number, height: number) =>
  (
    await sharp({ create: { width, height, channels: 3, background: { r: 30, g: 120, b: 200 } } })
      .png()
      .toBuffer()
  ).toString("base64");

const send = (raw: string) =>
  POST({
    request: new Request("http://localhost/api/v4/images", { method: "POST", body: raw }),
  } as Parameters<typeof POST>[0]);
const post = (body: unknown) => send(JSON.stringify(body));
const tinyPng = await png(8, 8);
const widePng = await png(4097, 1);
const noisyPng = await sharp(randomBytes(64 * 64 * 3), { raw: { width: 64, height: 64, channels: 3 } })
  .png()
  .toBuffer();
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"></svg>').toString("base64");
const storedBytes = () => Buffer.from(db.insertImage.mock.calls[0][0].data, "base64");

beforeEach(() => {
  db.insertImage.mockClear();
});

describe("POST /api/v4/images", () => {
  it("returns 201 with the stored image and no image data, at the original size when no size is sent", async () => {
    const response = await post({ base64: await png(1200, 630), mime_type: "image/png" });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.image.id).toMatch(/^[0-9a-f]{16}\.png$/);
    expect(body).toStrictEqual({
      image: {
        id: body.image.id,
        url: `/assets/images/${body.image.id}`,
        mime_type: "image/png",
        width: 1200,
        height: 630,
        size: storedBytes().length,
      },
    });
  });

  it("scales down to fit max_width × max_height, and crops to exactly that size with force_dimensions", async () => {
    const base64 = await png(1200, 630);
    const sizes = { base64, mime_type: "image/png", max_width: 256, max_height: 256 };

    const fit = await (await post(sizes)).json();
    const forced = await (await post({ ...sizes, force_dimensions: true })).json();

    expect([fit.image.width, fit.image.height]).toEqual([256, 134]);
    expect([forced.image.width, forced.image.height]).toEqual([256, 256]);
  });

  it("stores file_name as the image's original name", async () => {
    await post({ base64: await png(8, 8), mime_type: "image/png", file_name: "logo.png" });

    expect(db.insertImage.mock.calls[0][0]).toMatchObject({ original_name: "logo.png" });
  });

  it.each([
    ["empty image data", { base64: "", mime_type: "image/png" }, "Image data is required"],
    [
      "an SVG mime_type",
      { base64: svg, mime_type: "image/svg+xml" },
      "Invalid image type. Allowed types: image/png, image/jpeg, image/jpg, image/webp, image/heic, image/heif",
    ],
    ["SVG bytes sent as PNG", { base64: svg, mime_type: "image/png" }, "SVG uploads are not allowed"],
    [
      "PNG bytes sent as JPEG",
      { base64: tinyPng, mime_type: "image/jpeg" },
      "Image MIME type does not match file content",
    ],
    [
      "more than 2 MB after decoding",
      { base64: Buffer.alloc(2 * 1024 * 1024 + 1).toString("base64"), mime_type: "image/png" },
      "Image is too large. Maximum upload size is 2MB",
    ],
    [
      "a file_name longer than 255 characters",
      { base64: tinyPng, mime_type: "image/png", file_name: `${"a".repeat(252)}.png` },
      "File name must be 255 characters or fewer",
    ],
    [
      "bytes that are not an image",
      { base64: Buffer.from("not an image").toString("base64"), mime_type: "image/png" },
      "Could not read image data",
    ],
    [
      "a PNG cut off halfway",
      { base64: noisyPng.subarray(0, noisyPng.length / 2).toString("base64"), mime_type: "image/png" },
      "Could not read image data",
    ],
    [
      "a HEIC header with no image after it",
      {
        base64: Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypheic"), Buffer.alloc(40)]).toString(
          "base64",
        ),
        mime_type: "image/heic",
      },
      "Could not read image data",
    ],
    [
      "a side longer than 4096 px",
      { base64: widePng, mime_type: "image/png" },
      "Image dimensions exceed maximum allowed size of 4096x4096",
    ],
  ])("returns 400 BAD_REQUEST for %s, and stores nothing", async (_case, body, message) => {
    const response = await post(body);

    expect(response.status).toBe(400);
    expect(await response.json()).toStrictEqual({ error: { code: "BAD_REQUEST", message } });
    expect(db.insertImage).not.toHaveBeenCalled();
  });

  it("returns 500 INTERNAL_ERROR with a fixed message when the database write fails", async () => {
    db.insertImage.mockRejectedValueOnce(
      new Error('insert into `images` (`data`) values (?) - ER_DATA_TOO_LONG: Data too long for column "data"'),
    );

    const response = await post({ base64: tinyPng, mime_type: "image/png" });

    expect(response.status).toBe(500);
    expect(await response.json()).toStrictEqual({
      error: { code: "INTERNAL_ERROR", message: "Failed to upload image" },
    });
  });

  it.each([
    ["a body that is not JSON", "{", "Invalid JSON body"],
    ["a JSON body that is not an object", "null", "base64 is required and must be a string"],
    ["no base64", JSON.stringify({ mime_type: "image/png" }), "base64 is required and must be a string"],
    [
      "a base64 that is not a string",
      JSON.stringify({ base64: 1, mime_type: "image/png" }),
      "base64 is required and must be a string",
    ],
    ["no mime_type", JSON.stringify({ base64: tinyPng }), "mime_type is required and must be a string"],
    [
      "a file_name that is not a string",
      JSON.stringify({ base64: tinyPng, mime_type: "image/png", file_name: 1 }),
      "file_name must be a string",
    ],
    ...[0, -256, 25.5, "256", null, 4097].map((max_width) => [
      `max_width ${JSON.stringify(max_width)}`,
      JSON.stringify({ base64: tinyPng, mime_type: "image/png", max_width }),
      "max_width must be an integer from 1 to 4096",
    ]),
    ...[0, 4097].map((max_height) => [
      `max_height ${max_height}`,
      JSON.stringify({ base64: tinyPng, mime_type: "image/png", max_height }),
      "max_height must be an integer from 1 to 4096",
    ]),
    [
      "PNG bytes sent as image/heic",
      JSON.stringify({ base64: tinyPng, mime_type: "image/heic" }),
      "Image MIME type does not match file content",
    ],
    [
      'force_dimensions "true"',
      JSON.stringify({ base64: tinyPng, mime_type: "image/png", force_dimensions: "true" }),
      "force_dimensions must be a boolean",
    ],
  ])("returns 400 BAD_REQUEST for %s, and stores nothing", async (_case, raw, message) => {
    const response = await send(raw);

    expect(response.status).toBe(400);
    expect(await response.json()).toStrictEqual({ error: { code: "BAD_REQUEST", message } });
    expect(db.insertImage).not.toHaveBeenCalled();
  });
});

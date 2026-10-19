import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import sharp from "sharp";
import type { Knex } from "knex";

// TEST_DATABASE_URL=postgresql://… or mysql://… runs this file on that engine instead of in-memory SQLite.
vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});
vi.mock("$lib/server/db/db", async () => {
  const { default: DbImpl } = await import("$lib/server/db/dbimpl");
  if (process.env.TEST_DATABASE_URL) {
    const { default: knexOb } = await import("../../../../knexfile");
    return { default: new DbImpl(knexOb) };
  }
  return {
    default: new DbImpl({ client: "better-sqlite3", connection: { filename: ":memory:" }, useNullAsDefault: true }),
  };
});

import db from "$lib/server/db/db";
import { uploadImage } from "./imageController.js";
import { GET } from "../../../routes/(assets)/assets/images/[id]/+server";

const migrations = import.meta.glob<Knex.Migration>("/migrations/*.ts", { eager: true });
const knex = (db as unknown as { knex: Knex }).knex;

const png = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: { r: 30, g: 120, b: 200 } } })
    .png()
    .toBuffer();
const jpeg = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: { r: 200, g: 60, b: 20 } } })
    .jpeg()
    .toBuffer();

async function serve(id: string) {
  const response = await GET({ params: { id } } as never);
  return { response, bytes: Buffer.from(await response.arrayBuffer()) };
}

beforeAll(async () => {
  await knex.migrate.latest({
    migrationSource: {
      getMigrations: async () => Object.keys(migrations).sort(),
      getMigrationName: (name: string) => name.slice("/migrations/".length),
      getMigration: async (name: string) => migrations[name],
    },
  });
});

beforeEach(async () => {
  await knex("images").del();
});

afterAll(async () => {
  await knex.destroy();
});

describe("uploadImage", () => {
  it("names a PNG after the SHA-256 of the stored bytes and returns what it stored", async () => {
    const image = await uploadImage({ base64: (await png(40, 20)).toString("base64"), mimeType: "image/png" });

    expect(image.id).toMatch(/^[0-9a-f]{16}\.png$/);
    const { response, bytes } = await serve(image.id);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(image.id).toBe(`${createHash("sha256").update(bytes).digest("hex").slice(0, 16)}.png`);
    expect(image).toEqual({
      id: image.id,
      url: `/assets/images/${image.id}`,
      mime_type: "image/png",
      width: 40,
      height: 20,
      size: bytes.length,
    });
  });

  it("keeps a JPEG as JPEG under a .jpg ID", async () => {
    const image = await uploadImage({ base64: (await jpeg(40, 20)).toString("base64"), mimeType: "image/jpeg" });

    expect(image.id).toMatch(/^[0-9a-f]{16}\.jpg$/);
    expect(image.mime_type).toBe("image/jpeg");
    expect((await serve(image.id)).response.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("returns the existing row when the same image is uploaded again", async () => {
    const base64 = (await png(40, 20)).toString("base64");

    const first = await uploadImage({ base64, mimeType: "image/png", fileName: "logo.png" });
    const second = await uploadImage({ base64, mimeType: "image/png", fileName: "copy.png" });

    expect(second).toEqual(first);
    expect(await db.getAllImages()).toHaveLength(1);
  });

  it("stores one row when the same image is uploaded twice at once", async () => {
    const base64 = (await png(40, 20)).toString("base64");

    const [a, b] = await Promise.all([
      uploadImage({ base64, mimeType: "image/png" }),
      uploadImage({ base64, mimeType: "image/png" }),
    ]);

    expect(a.id).toBe(b.id);
    expect(await db.getAllImages()).toHaveLength(1);
  });

  it("does not resize when no size is given", async () => {
    const image = await uploadImage({ base64: (await png(1200, 630)).toString("base64"), mimeType: "image/png" });

    expect([image.width, image.height]).toEqual([1200, 630]);
    const { bytes } = await serve(image.id);
    const stored = await sharp(bytes).metadata();
    expect([stored.width, stored.height]).toEqual([1200, 630]);
  });

  it("fits the image inside the dashboard's 256x256 default", async () => {
    const image = await uploadImage({
      base64: (await png(1200, 630)).toString("base64"),
      mimeType: "image/png",
      maxWidth: 256,
      maxHeight: 256,
    });

    const stored = await sharp((await serve(image.id)).bytes).metadata();
    expect([stored.width, stored.height]).toEqual([256, 134]);
    expect([image.width, image.height]).toEqual([256, 134]);
  });

  it("crops to the exact size when forceDimensions is set", async () => {
    const image = await uploadImage({
      base64: (await png(1200, 630)).toString("base64"),
      mimeType: "image/png",
      maxWidth: 256,
      maxHeight: 256,
      forceDimensions: true,
    });

    const stored = await sharp((await serve(image.id)).bytes).metadata();
    expect([stored.width, stored.height]).toEqual([256, 256]);
    expect([image.width, image.height]).toEqual([256, 256]);
  });

  it("stores an image over MySQL's 65,535-byte text limit in full, with bytes that hash to its ID", async () => {
    const noisy = await sharp(randomBytes(160 * 160 * 3), { raw: { width: 160, height: 160, channels: 3 } })
      .png()
      .toBuffer();
    const base64 = noisy.toString("base64");
    expect(base64.length).toBeGreaterThan(65_535);

    const image = await uploadImage({ base64, mimeType: "image/png" });

    const { bytes } = await serve(image.id);
    expect(bytes.length).toBe(image.size);
    expect(image.id).toBe(`${createHash("sha256").update(bytes).digest("hex").slice(0, 16)}.png`);
  });

  it("states the real upload limit when the image is too large", async () => {
    const base64 = Buffer.alloc(2 * 1024 * 1024 + 1).toString("base64");

    await expect(uploadImage({ base64, mimeType: "image/png" })).rejects.toThrow(
      "Image is too large. Maximum upload size is 2MB",
    );
  });
});

describe("GET /assets/images/[id]", () => {
  it("still serves an image stored under an old nanoid ID", async () => {
    const original = await png(10, 10);
    await db.insertImage({
      id: "V1StGXR8_Z5jdHi6.png",
      data: original.toString("base64"),
      mime_type: "image/png",
      original_name: "old.png",
      width: 10,
      height: 10,
      size: original.length,
    });

    const { response, bytes } = await serve("V1StGXR8_Z5jdHi6.png");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(bytes.equals(original)).toBe(true);
  });
});

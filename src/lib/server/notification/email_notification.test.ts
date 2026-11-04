import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Knex } from "knex";
import sharp from "sharp";
import nodemailer from "nodemailer";

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

const { transport, resendSend, setup } = vi.hoisted(() => ({
  transport: { sendMail: vi.fn(async (options: unknown) => options) },
  resendSend: vi.fn(async () => ({ data: { id: "sent" }, error: null })),
  setup: { resend: false },
}));
vi.mock("../controllers/emailController.js", () => ({
  IsEmailSetup: () => true,
  IsResendSetup: () => setup.resend,
}));
vi.mock("../controllers/commonController.js", () => ({
  GetSMTPFromENV: () => ({
    smtp_host: "smtp.test",
    smtp_port: 25,
    smtp_user: "",
    smtp_pass: "",
    smtp_sender: "kener@test",
  }),
}));
vi.mock("./smtps.js", () => ({ default: () => transport }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resendSend };
  },
}));

import db from "$lib/server/db/db";
import { uploadImage } from "../controllers/imageController.js";
import send from "./email_notification.js";

const migrations = import.meta.glob<Knex.Migration>("/migrations/*.ts", { eager: true });
const knex = (db as unknown as { knex: Knex }).knex;
let logo: { id: string; content: Buffer };

beforeAll(async () => {
  await knex.migrate.latest({
    migrationSource: {
      getMigrations: async () => Object.keys(migrations).sort(),
      getMigrationName: (name: string) => name.slice("/migrations/".length),
      getMigration: async (name: string) => migrations[name],
    },
  });
  const png = await sharp({ create: { width: 40, height: 20, channels: 3, background: "#ff0000" } })
    .png()
    .toBuffer();
  const uploaded = await uploadImage({ base64: png.toString("base64"), mimeType: "image/png", fileName: "logo.png" });
  const stored = await db.getImageById(uploaded.id);
  logo = { id: uploaded.id, content: Buffer.from(stored!.data, "base64") };
});

beforeEach(() => {
  vi.clearAllMocks();
  setup.resend = false;
});

afterAll(async () => {
  await knex("images").where("id", logo.id).del();
  await knex.destroy();
});

const template = () => `<p>{{greeting}}</p><img src="cid:${logo.id}" alt="logo" /><img src="cid:${logo.id}" />`;

describe("images in email templates", () => {
  it("sends each image the HTML refers to by cid as one inline attachment over SMTP", async () => {
    await send(template(), "Hello", { greeting: "Hi" }, ["ana@example.com"]);

    expect(transport.sendMail).toHaveBeenCalledOnce();
    const mail = transport.sendMail.mock.calls[0][0] as { html: string; attachments: unknown[] };
    expect(mail.html).toContain(`<img src="cid:${logo.id}"`);
    expect(mail.attachments).toEqual([
      { cid: logo.id, filename: "logo.png", content: logo.content, contentType: "image/png" },
    ]);
  });

  it("builds a message whose image is inline, under the Content-ID the HTML refers to", async () => {
    const stream = nodemailer.createTransport({ streamTransport: true, buffer: true });
    transport.sendMail.mockImplementationOnce((options) =>
      stream.sendMail(options as Parameters<typeof stream.sendMail>[0]),
    );

    const sent = (await send(template(), "Hello", { greeting: "Hi" }, ["ana@example.com"])) as { message: Buffer };

    const raw = sent.message.toString();
    expect(raw).toContain("Content-Type: multipart/related");
    expect(raw).toContain(`Content-ID: <${logo.id}>`);
    expect(raw).toContain("Content-Disposition: inline");
  });

  it("sends them as inline attachments through Resend", async () => {
    setup.resend = true;

    await send(template(), "Hello", { greeting: "Hi" }, ["ana@example.com"]);

    expect(resendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [{ contentId: logo.id, filename: "logo.png", content: logo.content, contentType: "image/png" }],
      }),
    );
  });

  it("sends an email without images as before", async () => {
    await send("<p>No pictures</p>", "Hello", {}, ["ana@example.com"]);
    setup.resend = true;
    await send("<p>No pictures</p>", "Hello", {}, ["ana@example.com"]);

    expect((transport.sendMail.mock.calls[0][0] as { attachments: unknown[] }).attachments).toEqual([]);
    expect(resendSend.mock.calls[0]).toEqual([expect.not.objectContaining({ attachments: expect.anything() })]);
  });

  it("sends the email without an image that no longer exists, and logs it", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await send(`<img src="cid:gone.png" /><img src="cid:${logo.id}" />`, "Hello", {}, ["ana@example.com"]);

    const mail = transport.sendMail.mock.calls[0][0] as { attachments: Array<{ cid: string }> };
    expect(mail.attachments.map((a) => a.cid)).toEqual([logo.id]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("cid:gone.png"));
    warn.mockRestore();
  });
});

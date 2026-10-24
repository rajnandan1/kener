import { afterEach, describe, expect, it } from "vitest";
import express from "express";
import http from "node:http";
import type { Server } from "node:http";
import { compressionMiddleware, isCompressionEnabled } from "./httpCompression";

/**
 * Fetches a URL and returns the bytes actually received on the socket.
 *
 * `fetch` transparently decodes a gzip response, so it cannot be used to
 * measure what went over the wire. node's http client does not decode, so the
 * chunk lengths here are the real transfer size.
 */
function wireBytes(url: string, acceptEncoding: string): Promise<{ bytes: number; encoding: string | undefined }> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { headers: { "Accept-Encoding": acceptEncoding } }, (res) => {
      let bytes = 0;
      res.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
      });
      res.on("end", () => resolve({ bytes, encoding: res.headers["content-encoding"] }));
    });
    req.on("error", reject);
  });
}

let server: Server | null = null;

/** Starts a throwaway app on an ephemeral port and returns its base URL. */
async function startApp(withCompression: boolean): Promise<string> {
  const app = express();
  if (withCompression) app.use(compressionMiddleware());
  // Large and repetitive, like a monitor-bars payload, so it is worth compressing.
  app.get("/payload", (_req, res) => {
    res.json({
      data: Array.from({ length: 500 }, (_, i) => ({
        monitor_tag: "service-" + i,
        countOfUp: 1440,
        countOfDown: 0,
        countOfDegraded: 0,
        countOfMaintenance: 0,
      })),
    });
  });

  return await new Promise((resolve) => {
    server = app.listen(0, () => {
      const address = server!.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve(`http://127.0.0.1:${port}`);
    });
  });
}

afterEach(async () => {
  if (server) {
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = null;
  }
});

describe("isCompressionEnabled", () => {
  it("is on when the variable is not set", () => {
    expect(isCompressionEnabled({})).toBe(true);
  });

  it("is off only for the exact value true", () => {
    expect(isCompressionEnabled({ KENER_DISABLE_COMPRESSION: "true" })).toBe(false);
  });

  it.each(["false", "TRUE", "1", "yes", ""])("stays on for %o", (value) => {
    expect(isCompressionEnabled({ KENER_DISABLE_COMPRESSION: value })).toBe(true);
  });
});

describe("compression middleware", () => {
  it("compresses when the client asks for gzip", async () => {
    const base = await startApp(true);
    const res = await fetch(base + "/payload", { headers: { "Accept-Encoding": "gzip" } });
    expect(res.headers.get("content-encoding")).toBe("gzip");
  });

  it("does not compress when the client does not ask", async () => {
    const base = await startApp(true);
    const res = await fetch(base + "/payload", { headers: { "Accept-Encoding": "identity" } });
    expect(res.headers.get("content-encoding")).toBeNull();
  });

  it("sends nothing compressed when the middleware is absent", async () => {
    const base = await startApp(false);
    const res = await fetch(base + "/payload", { headers: { "Accept-Encoding": "gzip" } });
    expect(res.headers.get("content-encoding")).toBeNull();
  });

  it("makes a repetitive payload much smaller on the wire", async () => {
    const base = await startApp(true);

    const plain = await wireBytes(base + "/payload", "identity");
    const gzipped = await wireBytes(base + "/payload", "gzip");

    expect(plain.encoding).toBeUndefined();
    expect(gzipped.encoding).toBe("gzip");

    // Both numbers are real socket bytes from the same server, so this compares
    // like with like. A repetitive JSON payload should shrink by a lot.
    expect(plain.bytes).toBeGreaterThan(10000);
    expect(gzipped.bytes).toBeLessThan(plain.bytes / 5);
  });

  it("returns the same JSON whether or not it was compressed", async () => {
    const base = await startApp(true);
    const compressed = await fetch(base + "/payload", { headers: { "Accept-Encoding": "gzip" } });
    const plain = await fetch(base + "/payload", { headers: { "Accept-Encoding": "identity" } });
    expect(await compressed.json()).toEqual(await plain.json());
  });
});

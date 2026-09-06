import compression from "compression";
import type { RequestHandler } from "express";

/**
 * Whether responses should be compressed.
 *
 * adapter-node does not compress, so without the middleware every response goes
 * out raw. Deployments behind a proxy that already compresses can opt out, so
 * the work is not done twice.
 *
 * Only the exact string "true" turns it off, so a stray value cannot silently
 * disable compression.
 */
export const isCompressionEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env.KENER_DISABLE_COMPRESSION !== "true";

/** The compression middleware, in its own module so it can be tested. */
export const compressionMiddleware = (): RequestHandler => compression();

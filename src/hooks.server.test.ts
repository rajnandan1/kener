import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Handle, RequestEvent, ResolveOptions } from "@sveltejs/kit";

const { db } = vi.hoisted(() => ({
  db: { getApiKeyByHashedKey: vi.fn(async (_hashedKey: string): Promise<{ status: string } | undefined> => undefined) },
}));
vi.mock("$lib/server/db/db", () => ({ default: db }));
// SvelteKit's sequence() needs a request store that only its server runtime sets up.
vi.mock("@sveltejs/kit/hooks", () => ({
  sequence:
    (...handlers: Handle[]): Handle =>
    ({ event, resolve }) =>
      handlers.reduceRight<(event: RequestEvent, opts?: ResolveOptions) => ReturnType<Handle>>(
        (next, handle) => (event) => handle({ event, resolve: next }),
        resolve,
      )(event),
}));

import { handle } from "./hooks.server";

async function postImage(headers: Record<string, string>) {
  const resolve = vi.fn(async () => new Response("reached the route", { status: 201 }));
  const url = new URL("http://localhost/api/v4/images");
  const event = {
    url,
    request: new Request(url, { method: "POST", headers: { "content-type": "application/json", ...headers } }),
    route: { id: "/(api)/api/v4/images" },
    cookies: { get: () => undefined },
    locals: {},
  } as unknown as RequestEvent;
  const response = await handle({ event, resolve });
  return { response, resolve };
}

beforeEach(() => {
  db.getApiKeyByHashedKey.mockClear();
});

describe("POST /api/v4/images through the hooks", () => {
  it.each([
    ["no Authorization header", {}, "Missing or invalid authorization header"],
    ["an unknown API key", { authorization: "Bearer kener_unknown" }, "Invalid API key"],
  ])("returns 401 UNAUTHORIZED for %s and never reaches the route", async (_case, headers, message) => {
    const { response, resolve } = await postImage(headers);

    expect(response.status).toBe(401);
    expect(await response.json()).toStrictEqual({ error: { code: "UNAUTHORIZED", message } });
    expect(resolve).not.toHaveBeenCalled();
  });

  it("reaches the route with an active API key", async () => {
    db.getApiKeyByHashedKey.mockResolvedValueOnce({ status: "ACTIVE" });

    const { response, resolve } = await postImage({ authorization: "Bearer kener_valid" });

    expect(resolve).toHaveBeenCalledOnce();
    expect(response.status).toBe(201);
  });
});

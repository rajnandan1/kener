import { describe, expect, it, vi } from "vitest";

vi.mock("$lib/server/db/db", () => ({ default: {} }));
vi.mock("$lib/server/controllers/monitorsController", () => ({ AttachSslCacheFields: vi.fn() }));

import { publicServiceUrl } from "./shared";

describe("publicServiceUrl", () => {
  it("links absolute http and https URLs", () => {
    expect(publicServiceUrl("https://example.com/health")).toBe("https://example.com/health");
    expect(publicServiceUrl("http://example.com")).toBe("http://example.com/");
  });

  it.each([null, undefined, "", "javascript:alert(1)", "data:text/html,hi", "/relative/path", "not a url"])(
    "returns null for %j",
    (value) => {
      expect(publicServiceUrl(value)).toBeNull();
    },
  );
});

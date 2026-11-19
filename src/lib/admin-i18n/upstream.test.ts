import { describe, expect, it } from "vitest";
import { checkUpstream, releaseReviewStatus } from "../../../scripts/admin-i18n/check-upstream.mjs";

describe("read-only upstream release tracking", () => {
  it("detects new stable releases and a locally merged version pending translation review", () => {
    expect(releaseReviewStatus({ latest: "v4.2.1", local: "4.2.1", reviewed: "4.2.1" })).toMatchObject({
      upstreamUpdateAvailable: false,
      translationReviewRequired: false,
    });
    expect(releaseReviewStatus({ latest: "v4.2.2", local: "4.2.1", reviewed: "4.2.1" })).toMatchObject({
      upstreamUpdateAvailable: true,
      translationReviewRequired: true,
    });
    expect(releaseReviewStatus({ latest: "v4.2.2", local: "4.2.2", reviewed: "4.2.1" })).toMatchObject({
      upstreamUpdateAvailable: false,
      translationReviewRequired: true,
    });
  });
  it("compares numeric versions without requesting a downgrade", () => {
    expect(releaseReviewStatus({ latest: "v4.10.0", local: "4.9.0", reviewed: "4.9.0" }).upstreamUpdateAvailable).toBe(
      true,
    );
    expect(releaseReviewStatus({ latest: "v4.2.1", local: "4.3.0", reviewed: "4.3.0" }).upstreamUpdateAvailable).toBe(
      false,
    );
    expect(() => releaseReviewStatus({ latest: "nightly", local: "4.2.1", reviewed: "4.2.1" })).toThrow(
      "Unsupported stable version",
    );
  });
  it("reports unavailable release information instead of silently claiming freshness", async () => {
    await expect(checkUpstream({ request: async () => new Response(null, { status: 503 }) })).rejects.toThrow(
      "HTTP 503",
    );
  });
});

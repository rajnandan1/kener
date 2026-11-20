import { afterEach, describe, expect, it, vi } from "vitest";

const { sendEmail } = vi.hoisted(() => ({
  sendEmail: vi.fn(async () => {}),
}));

vi.mock("../notification/email_notification.js", () => ({ default: sendEmail }));

import emailQueue from "./emailQueue";

afterEach(async () => {
  await emailQueue.shutdown();
  vi.unstubAllEnvs();
  sendEmail.mockClear();
});

describe("emailQueue without Redis", () => {
  it("sends a queued email in-process", async () => {
    vi.stubEnv("REDIS_URL", "");

    await emailQueue.push({
      toEmails: ["user@example.com"],
      templateHtmlBody: "<p>Hello</p>",
      templateSubject: "Status update",
      variables: { status: "UP" },
    });

    await vi.waitFor(() =>
      expect(sendEmail).toHaveBeenCalledWith(
        "<p>Hello</p>",
        "Status update",
        { status: "UP" },
        ["user@example.com"],
        undefined,
        undefined,
      ),
    );
  });
});

import { describe, expect, it, vi } from "vitest";
import { checkHealth } from "./health";

describe("checkHealth", () => {
  it("stays healthy when Redis is not configured", async () => {
    const redisCheck = vi.fn(async () => true);

    const health = await checkHealth({
      database: async () => true,
      redis: redisCheck,
      redisConfigured: false,
    });

    expect(health).toEqual({
      healthy: true,
      body: { status: "ok", db: true, redis: true, redisConfigured: false },
    });
    expect(redisCheck).not.toHaveBeenCalled();
  });

  it("degrades when a configured Redis is unavailable", async () => {
    const health = await checkHealth({
      database: async () => true,
      redis: async () => false,
      redisConfigured: true,
    });

    expect(health).toEqual({
      healthy: false,
      body: { status: "degraded", db: true, redis: false, redisConfigured: true },
    });
  });

  it("degrades when the database is unavailable", async () => {
    const health = await checkHealth({
      database: async () => {
        throw new Error("database unavailable");
      },
      redisConfigured: false,
    });

    expect(health).toEqual({
      healthy: false,
      body: { status: "degraded", db: false, redis: true, redisConfigured: false },
    });
  });
});

interface HealthChecks {
  database: () => Promise<unknown>;
  redis?: () => Promise<unknown>;
  redisConfigured: boolean;
}

const probe = async (check: () => Promise<unknown>): Promise<boolean> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      check(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("health probe timeout")), 2000);
      }),
    ]);
    return result !== false;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};

export async function checkHealth(checks: HealthChecks) {
  const [db, redis] = await Promise.all([
    probe(checks.database),
    checks.redisConfigured && checks.redis ? probe(checks.redis) : Promise.resolve(true),
  ]);
  const healthy = db && (!checks.redisConfigured || redis);

  return {
    healthy,
    body: {
      status: healthy ? "ok" : "degraded",
      db,
      redis,
      redisConfigured: checks.redisConfigured,
    },
  };
}

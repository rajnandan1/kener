import type { Knex as KnexType } from "knex";
import { GetDbType } from "../../tool.js";

const SITE_DATA_WRITE_LOCK = "kener:site_data_write";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractScalar(value: unknown): unknown {
  if (Array.isArray(value)) {
    return extractScalar(value[0]);
  }

  if (isRecord(value)) {
    if ("rows" in value) {
      return extractScalar(value.rows);
    }

    const keys = Object.keys(value);
    if (keys.length === 1) {
      return value[keys[0]];
    }
  }

  return value;
}

function isAcquiredLock(result: unknown): boolean {
  const scalar = extractScalar(result);
  return scalar === 1 || scalar === "1" || scalar === true;
}

export async function withSerializedSiteDataWrite<T>(
  trx: KnexType.Transaction,
  run: () => Promise<T>,
): Promise<T> {
  const dbType = GetDbType();

  if (dbType === "postgresql") {
    await trx.raw("select pg_advisory_xact_lock(hashtext(?))", [SITE_DATA_WRITE_LOCK]);
    return await run();
  }

  if (dbType === "mysql") {
    const lockResult = await trx.raw("select GET_LOCK(?, 10) as locked", [SITE_DATA_WRITE_LOCK]);
    if (!isAcquiredLock(lockResult)) {
      throw new Error("Failed to acquire site_data write lock");
    }

    let actionError: unknown;
    try {
      return await run();
    } catch (error) {
      actionError = error;
      throw error;
    } finally {
      try {
        const releaseResult = await trx.raw("select RELEASE_LOCK(?) as released", [SITE_DATA_WRITE_LOCK]);
        if (!isAcquiredLock(releaseResult)) {
          throw new Error("Failed to release site_data write lock");
        }
      } catch (releaseError) {
        if (actionError === undefined) {
          throw releaseError;
        }
        console.error(releaseError);
      }
    }
  }

  return await run();
}

import { browser } from "$app/environment";
import { resolve } from "$app/paths";
import clientResolver from "$lib/client/resolver.js";
import type { MonitorBarResponse } from "$lib/server/api-server/monitor-bar/get";

interface MonitorBarsResponse {
  data: Record<string, MonitorBarResponse>;
  missingTags: string[];
}

interface Waiter {
  resolve: (value: MonitorBarResponse) => void;
  reject: (reason?: unknown) => void;
}

interface BatchState {
  tags: Set<string>;
  waitersByTag: Map<string, Waiter[]>;
  timer: ReturnType<typeof setTimeout>;
}

const pendingBatches = new Map<string, BatchState>();

/** In-memory cache: survives across component mounts, cleared on page refresh */
const cache = new Map<string, MonitorBarResponse>();

const makeBatchKey = (days: number, endOfDayTodayAtTz: number): string => `${days}:${endOfDayTodayAtTz}`;
const makeCacheKey = (tag: string, days: number, endOfDayTodayAtTz: number): string =>
  `${tag}:${days}:${endOfDayTodayAtTz}`;

const flushBatch = async (key: string): Promise<void> => {
  const batch = pendingBatches.get(key);
  if (!batch) return;

  pendingBatches.delete(key);
  const tags = Array.from(batch.tags);

  const [daysStr, endTsStr] = key.split(":");
  const days = Number(daysStr);
  const endOfDayTodayAtTz = Number(endTsStr);

  try {
    const query = `?tags=${encodeURIComponent(tags.join(","))}&endOfDayTodayAtTz=${endOfDayTodayAtTz}&days=${days}`;
    const response = await fetch(clientResolver(resolve, "/dashboard-apis/monitor-bars") + query);

    if (!response.ok) {
      throw new Error("Failed to fetch monitor bars");
    }

    const payload = (await response.json()) as MonitorBarsResponse;

    for (const tag of tags) {
      const waiters = batch.waitersByTag.get(tag) || [];
      const item = payload.data[tag];
      if (item) {
        cache.set(makeCacheKey(tag, days, endOfDayTodayAtTz), item);
        waiters.forEach((w) => w.resolve(item));
      } else {
        const missingError = new Error(`Monitor data not found for tag: ${tag}`);
        waiters.forEach((w) => w.reject(missingError));
      }
    }
  } catch (err) {
    for (const waiters of batch.waitersByTag.values()) {
      waiters.forEach((w) => w.reject(err));
    }
  }
};

export const requestMonitorBar = (
  tag: string,
  days: number,
  endOfDayTodayAtTz: number,
): Promise<MonitorBarResponse> => {
  if (!browser) {
    return Promise.reject(new Error("requestMonitorBar can only be called in the browser"));
  }

  // Return cached data immediately if available
  const cacheKey = makeCacheKey(tag, days, endOfDayTodayAtTz);
  const cached = cache.get(cacheKey);
  if (cached) {
    return Promise.resolve(cached);
  }

  const key = makeBatchKey(days, endOfDayTodayAtTz);

  return new Promise<MonitorBarResponse>((resolvePromise, rejectPromise) => {
    let batch = pendingBatches.get(key);
    if (!batch) {
      batch = {
        tags: new Set<string>(),
        waitersByTag: new Map<string, Waiter[]>(),
        timer: setTimeout(() => {
          void flushBatch(key);
        }, 0),
      };
      pendingBatches.set(key, batch);
    }

    batch.tags.add(tag);
    const waiters = batch.waitersByTag.get(tag) || [];
    waiters.push({ resolve: resolvePromise, reject: rejectPromise });
    batch.waitersByTag.set(tag, waiters);
  });
};

/** Evict all cached entries (useful if caller needs a forced refresh) */
export const clearMonitorBarCache = (): void => {
  cache.clear();
};

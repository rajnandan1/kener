import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalQueue, LocalWorker } from "./localQueue";
import q from "./q";

const workers: Array<{ close: () => Promise<void> }> = [];

afterEach(async () => {
  await Promise.all(workers.splice(0).map((worker) => worker.close()));
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("LocalQueue", () => {
  it("runs a queued job and reports completion", async () => {
    const queue = new LocalQueue();
    const completed = vi.fn();
    const worker = new LocalWorker(queue, async (job) => {
      return job.data;
    });
    workers.push(worker);
    worker.on("completed", completed);

    await queue.add("run", { value: "completed" });

    await vi.waitFor(() =>
      expect(completed).toHaveBeenCalledWith(expect.objectContaining({ name: "run" }), {
        value: "completed",
      }),
    );
  });

  it("runs only one job for a deduplication id", async () => {
    const queue = new LocalQueue<{ id: number }>();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const seen: number[] = [];
    const worker = new LocalWorker(queue, async (job) => {
      seen.push(job.data.id);
      await gate;
    });
    workers.push(worker);

    await queue.add("run", { id: 1 }, { deduplication: { id: "same" } });
    await queue.add("run", { id: 2 }, { deduplication: { id: "same" } });
    await vi.waitFor(() => expect(seen).toEqual([1]));
    try {
      await queue.add("run", { id: 3 }, { deduplication: { id: "same" } });
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(seen).toEqual([1]);
    } finally {
      release();
    }
  });

  it("retries a failed job with its configured attempts", async () => {
    const queue = new LocalQueue();
    let attempts = 0;
    const worker = new LocalWorker(queue, async () => {
      attempts++;
      if (attempts < 2) throw new Error("retry");
      return "done";
    });
    workers.push(worker);

    await queue.add("retry", {}, { attempts: 2, backoff: { type: "fixed", delay: 1 } });

    await vi.waitFor(() => expect(attempts).toBe(2));
  });

  it("isolates listener errors from job outcomes", async () => {
    const queue = new LocalQueue();
    const processor = vi.fn(async () => "done");
    const followingListener = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const worker = new LocalWorker(queue, processor);
    workers.push(worker);
    worker.on("completed", () => {
      throw new Error("listener failed");
    });
    worker.on("completed", followingListener);

    await queue.add("listener", {});

    await vi.waitFor(() => expect(followingListener).toHaveBeenCalledOnce());
    expect(processor).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith('Local queue "completed" listener threw:', expect.any(Error));
  });

  it("logs a final failure when no failed listener is registered", async () => {
    const queue = new LocalQueue();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const processor = vi.fn(async () => {
      throw new Error("failed");
    });
    const worker = new LocalWorker(queue, processor);
    workers.push(worker);

    await queue.add("fail", {}, { attempts: 2, backoff: { type: "fixed", delay: 1 } });

    await vi.waitFor(() => expect(processor).toHaveBeenCalledTimes(2));
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Local queue job "fail"'), expect.any(Error));
  });

  it("stops retrying when closed during backoff", async () => {
    const queue = new LocalQueue();
    const processor = vi.fn(async () => {
      throw new Error("retry later");
    });
    const worker = new LocalWorker(queue, processor);
    workers.push(worker);

    await queue.add("retry", {}, { attempts: 3, backoff: { type: "fixed", delay: 60_000 } });
    await vi.waitFor(() => expect(processor).toHaveBeenCalledOnce());

    await worker.close();

    expect(processor).toHaveBeenCalledOnce();
  });

  it("releases a worker slot while a failed job waits to retry", async () => {
    vi.useFakeTimers();
    const queue = new LocalQueue<{ id: string }>();
    const seen: string[] = [];
    const worker = new LocalWorker(
      queue,
      async (job) => {
        seen.push(job.data.id);
        if (job.data.id === "retry" && job.attemptsMade === 0) throw new Error("retry later");
        return undefined;
      },
      { concurrency: 1 },
    );
    workers.push(worker);

    await queue.add("retry", { id: "retry" }, { attempts: 2, backoff: { type: "fixed", delay: 60_000 } });
    await queue.add("next", { id: "next" });
    await vi.advanceTimersByTimeAsync(0);

    expect(seen).toEqual(["retry", "next"]);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(seen).toEqual(["retry", "next", "retry"]);
  });

  it("does not exceed the worker concurrency", async () => {
    const queue = new LocalQueue<{ id: number }>();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const seen: number[] = [];
    const worker = new LocalWorker(
      queue,
      async (job) => {
        seen.push(job.data.id);
        if (job.data.id === 1) await gate;
      },
      { concurrency: 1 },
    );
    workers.push(worker);

    await queue.add("run", { id: 1 });
    await queue.add("run", { id: 2 });
    try {
      await vi.waitFor(() => expect(seen).toEqual([1]));
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(seen).toEqual([1]);
    } finally {
      release();
    }
    await vi.waitFor(() => expect(seen).toEqual([1, 2]));
  });

  it("runs an interval scheduler immediately and stops it on close", async () => {
    const queue = new LocalQueue();
    const runs = vi.fn();
    const worker = new LocalWorker(queue, async (job) => {
      runs(job.name);
    });
    workers.push(worker);

    await queue.upsertJobScheduler("tick", { every: 50, immediately: true }, { data: {} });
    await vi.waitFor(() => expect(runs).toHaveBeenCalledWith("tick"));

    const count = runs.mock.calls.length;
    await worker.close();
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(runs).toHaveBeenCalledTimes(count);
  });

  it("removes a registered cron scheduler", async () => {
    const queue = new LocalQueue();
    const worker = new LocalWorker(queue, async () => undefined);
    workers.push(worker);

    await queue.upsertJobScheduler("midnight", { pattern: "0 0 * * *" }, { data: {} });
    expect(await queue.getJobSchedulers()).toEqual([{ name: "midnight" }]);

    await queue.removeJobScheduler("midnight");
    expect(await queue.getJobSchedulers()).toEqual([]);
  });

  it("rejects new schedulers after close", async () => {
    const queue = new LocalQueue();
    const worker = new LocalWorker(queue, async () => undefined);
    workers.push(worker);
    await worker.close();

    await expect(queue.upsertJobScheduler("late", { every: 1000 }, { data: {} })).rejects.toThrow(
      "Local queue is closed",
    );
  });

  it("runs a cron scheduler on its next matching second", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-10T00:00:00.000Z"));
    const queue = new LocalQueue();
    const runs = vi.fn();
    const worker = new LocalWorker(queue, async (job) => {
      runs(job.name);
    });
    workers.push(worker);

    await queue.upsertJobScheduler("cron-tick", { pattern: "* * * * * *" }, { data: {} });
    await vi.advanceTimersByTimeAsync(2000);

    expect(runs).toHaveBeenCalledWith("cron-tick");
  });
});

describe("queue factory without Redis", () => {
  it("runs jobs through the in-process queue", async () => {
    vi.stubEnv("REDIS_URL", "");
    const calls: string[] = [];
    const queue = q.createQueue("local-factory");
    const worker = q.createWorker<{ value: string }, void>(queue, async (job) => {
      calls.push(job.data.value);
    });

    await queue.add("run", { value: "factory" });
    await vi.waitFor(() => expect(calls).toEqual(["factory"]));

    await worker.close();
  });
});

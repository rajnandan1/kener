import { isRedisConfigured, redisIOConnection } from "../redisConnector.js";
import db from "../db/db.js";
import { LocalQueue, LocalWorker, isLocalQueue } from "./localQueue.js";
import {
  Queue,
  Worker,
  Job,
  type QueueOptions,
  type WorkerOptions,
  type Processor,
  type ConnectionOptions,
} from "bullmq";

/** Creates a BullMQ queue, or the in-process queue when Redis is unset. */
export const createQueue = (name: string, options?: Omit<QueueOptions, "connection" | "prefix">) => {
  const defaultJobOptions = {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  };
  if (!isRedisConfigured()) {
    return new LocalQueue(defaultJobOptions) as unknown as Queue;
  }

  let opts: QueueOptions = {
    connection: redisIOConnection() as ConnectionOptions,
    ...options,
  };
  opts.prefix = "kener"; //set prefix to name
  opts.defaultJobOptions = defaultJobOptions;
  return new Queue(name, opts);
};

/** Binds a worker processor to the selected queue backend. */
export const createWorker = <T = unknown, R = unknown>(
  queue: Queue,
  processor: Processor<T, R>,
  options?: Omit<WorkerOptions, "connection" | "prefix">,
) => {
  const wrapped: Processor<T, R> =
    typeof processor === "function"
      ? (job, token) => db.runInWorkerContext(() => Promise.resolve(processor(job, token)))
      : processor;

  if (isLocalQueue(queue)) {
    return new LocalWorker(
      queue as unknown as LocalQueue<T, R>,
      wrapped as unknown as (job: { data: T }) => Promise<R>,
      { concurrency: options?.concurrency ?? 5 },
    ) as unknown as Worker;
  }

  const opts: WorkerOptions = {
    connection: redisIOConnection() as ConnectionOptions,
    prefix: "kener",
    concurrency: 5,
    ...options,
  };
  // Route every job's database access to the worker pool. This is the single
  // chokepoint all BullMQ workers and schedulers flow through, so wrapping here
  // isolates background work from the web request pool (see db/poolContext.ts).
  // Sandboxed (string/URL) processors run out-of-process and pass through.
  return new Worker<T, R>(queue.name, wrapped, opts);
};

export default {
  createQueue,
  createWorker,
};

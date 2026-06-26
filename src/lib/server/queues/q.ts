import { redisIOConnection } from "../redisConnector.js";
import db from "../db/db.js";
import {
  Queue,
  Worker,
  Job,
  type QueueOptions,
  type WorkerOptions,
  type Processor,
  type ConnectionOptions,
} from "bullmq";

//create and return queue instance given name and options
export const createQueue = (name: string, options?: Omit<QueueOptions, "connection" | "prefix">) => {
  let opts: QueueOptions = {
    connection: redisIOConnection() as ConnectionOptions,
    ...options,
  };
  opts.prefix = "kener"; //set prefix to name
  opts.defaultJobOptions = {
    attempts: 3, //number of retries
    backoff: {
      type: "exponential",
      delay: 5000, //5 seconds
    },
    removeOnComplete: true, //remove job on completion
    removeOnFail: false, //do not remove job on failure
  };
  return new Queue(name, opts);
};

//create and return worker instance given queue, processor, and options
export const createWorker = <T = unknown, R = unknown>(
  queue: Queue,
  processor: Processor<T, R>,
  options?: Omit<WorkerOptions, "connection" | "prefix">,
) => {
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
  const wrapped: Processor<T, R> =
    typeof processor === "function"
      ? (job, token) => db.runInWorkerContext(() => Promise.resolve(processor(job, token)))
      : processor;
  return new Worker<T, R>(queue.name, wrapped, opts);
};

export default {
  createQueue,
  createWorker,
};

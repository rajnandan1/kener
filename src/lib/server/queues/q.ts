import { redisIOConnection } from "../redisConnector.js";
import { Queue, Worker, Job, type QueueOptions, type WorkerOptions, type Processor } from "bullmq";

//create and return queue instance given name and options
export const createQueue = (name: string, options?: Omit<QueueOptions, "connection" | "prefix">) => {
  let opts: QueueOptions = {
    connection: redisIOConnection(),
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
    connection: redisIOConnection(),
    prefix: "kener",
    concurrency: 5,
    ...options,
  };
  return new Worker<T, R>(queue.name, processor, opts);
};

export default {
  createQueue,
  createWorker,
};

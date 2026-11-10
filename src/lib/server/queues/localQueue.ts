import { Cron } from "croner";
import type { JobsOptions } from "bullmq";

interface LocalJobData<T = unknown> {
  id: string;
  name: string;
  data: T;
  opts: JobsOptions;
  attemptsMade: number;
}

type LocalProcessor<T = unknown, R = unknown> = (job: LocalJobData<T>) => Promise<R>;
type LocalEventHandler = (...args: unknown[]) => void;

interface SchedulerTemplate<T = unknown> {
  data?: T;
  opts?: JobsOptions;
}

interface SchedulerRepeat {
  every?: number;
  pattern?: string;
  immediately?: boolean;
}

interface SchedulerEntry<T = unknown> {
  name: string;
  repeat: SchedulerRepeat;
  template: SchedulerTemplate<T>;
  timer?: NodeJS.Timeout;
  cron?: Cron;
}

const retryDelay = (attemptsMade: number, options: JobsOptions): number => {
  const backoff = options.backoff;
  if (!backoff) return 0;
  const delay = typeof backoff === "number" ? backoff : (backoff.delay ?? 0);
  return backoff && typeof backoff === "object" && backoff.type === "exponential"
    ? delay * 2 ** Math.max(0, attemptsMade - 1)
    : delay;
};

/** In-process BullMQ-compatible queue for single-replica deployments. */
export class LocalQueue<T = unknown, R = unknown> {
  readonly local = true;

  private processor: LocalProcessor<T, R> | null = null;
  private readonly timers = new Set<NodeJS.Timeout>();
  private readonly retryWaiters = new Set<() => void>();
  private readonly schedulers = new Map<string, SchedulerEntry<T>>();
  private readonly scheduled = new Map<string, NodeJS.Timeout>();
  private readonly running = new Set<Promise<unknown>>();
  private readonly pending: Array<() => void> = [];
  private readonly handlers = new Map<string, LocalEventHandler[]>();
  private concurrency = 1;
  private active = 0;
  private closed = false;

  constructor(private readonly defaultJobOptions: JobsOptions = {}) {}

  /** Installs the processor used by jobs from this queue. */
  setProcessor(processor: LocalProcessor<T, R>): void {
    this.processor = processor;
  }

  /** Sets the maximum number of jobs that may run at once. */
  setConcurrency(concurrency: number): void {
    this.concurrency = Math.max(1, concurrency);
    this.drain();
  }

  private emit(event: string, ...args: unknown[]): number {
    const handlers = this.handlers.get(event) ?? [];
    for (const handler of handlers) {
      try {
        handler(...args);
      } catch (error) {
        console.error(`Local queue "${event}" listener threw:`, error);
      }
    }
    return handlers.length;
  }

  /** Registers a handler for local queue lifecycle events. */
  on(event: string, handler: LocalEventHandler): void {
    const handlers = this.handlers.get(event) ?? [];
    handlers.push(handler);
    this.handlers.set(event, handlers);
  }

  private execute(job: LocalJobData<T>, dedupeId?: string, timer?: NodeJS.Timeout): void {
    if (timer) this.timers.delete(timer);
    this.pending.push(() => this.start(job, dedupeId));
    this.drain();
  }

  private drain(): void {
    while (this.active < this.concurrency && this.pending.length > 0) {
      this.active++;
      this.pending.shift()!();
    }
  }

  private start(job: LocalJobData<T>, dedupeId?: string): void {
    if (!this.processor) throw new Error(`No local worker registered for job ${job.name}`);

    const promise = this.run(job, dedupeId);
    this.running.add(promise);
    const finalize = () => {
      this.running.delete(promise);
      this.active--;
      this.drain();
    };
    void promise.then(
      () => finalize(),
      (error) => {
        console.error(`Local queue job "${job.name}" failed unexpectedly:`, error);
        finalize();
      },
    );
  }

  private waitForRetry(milliseconds: number): Promise<void> {
    if (milliseconds <= 0) return Promise.resolve();

    return new Promise((resolve) => {
      let timer: NodeJS.Timeout;
      const done = () => {
        this.retryWaiters.delete(done);
        clearTimeout(timer);
        resolve();
      };
      timer = setTimeout(done, milliseconds);
      timer.unref?.();
      this.retryWaiters.add(done);
    });
  }

  private async run(job: LocalJobData<T>, dedupeId?: string): Promise<R | undefined> {
    const attempts = Math.max(1, job.opts.attempts ?? this.defaultJobOptions.attempts ?? 1);
    try {
      for (;;) {
        if (this.closed) return undefined;
        try {
          const result = await this.processor!(job);
          this.emit("completed", job, result);
          return result;
        } catch (error) {
          job.attemptsMade++;
          if (job.attemptsMade >= attempts) {
            if (this.emit("failed", job, error) === 0) {
              console.error(
                `Local queue job "${job.name}" (${job.id}) failed after ${job.attemptsMade} attempts:`,
                error,
              );
            }
            return undefined;
          }
          if (this.closed) return undefined;
          const delay = retryDelay(job.attemptsMade, job.opts);
          await this.waitForRetry(delay);
          if (this.closed) return undefined;
        }
      }
    } finally {
      if (dedupeId) this.scheduled.delete(dedupeId);
    }
  }

  /** Adds a job, optionally delayed or deduplicated by its options. */
  async add(name: string, data: T, options: JobsOptions = {}): Promise<LocalJobData<T>> {
    if (this.closed) throw new Error("Local queue is closed");
    if (!this.processor) throw new Error(`No local worker registered for queue before adding ${name}`);

    const opts: JobsOptions = {
      ...this.defaultJobOptions,
      ...options,
    };
    const dedupeId = opts.deduplication?.id;
    if (dedupeId && this.scheduled.has(dedupeId)) {
      return { id: dedupeId, name, data, opts, attemptsMade: 0 };
    }

    const job: LocalJobData<T> = {
      id: dedupeId ?? `${name}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      name,
      data,
      opts,
      attemptsMade: 0,
    };
    const delay = Math.max(0, opts.delay ?? 0);
    const timer = setTimeout(() => this.execute(job, dedupeId, timer), delay);
    timer.unref?.();
    this.timers.add(timer);
    if (dedupeId) this.scheduled.set(dedupeId, timer);
    return job;
  }

  private schedule(entry: SchedulerEntry<T>): void {
    const run = () => {
      if (this.closed) return;
      void this.add(entry.name, (entry.template.data ?? {}) as T, entry.template.opts).catch((error) => {
        if (!this.closed) console.error(`Local scheduler "${entry.name}" failed to enqueue:`, error);
      });
    };

    if (entry.repeat.immediately) run();
    if (entry.repeat.every) {
      entry.timer = setInterval(run, entry.repeat.every);
    } else if (entry.repeat.pattern) {
      entry.cron = new Cron(entry.repeat.pattern, { timezone: "UTC", protect: true }, run);
    }
  }

  /** Creates or replaces a repeating scheduler. */
  async upsertJobScheduler(name: string, repeat: SchedulerRepeat, template: SchedulerTemplate<T> = {}): Promise<void> {
    if (this.closed) throw new Error("Local queue is closed");
    await this.removeJobScheduler(name);
    const entry = { name, repeat, template };
    this.schedulers.set(name, entry);
    this.schedule(entry);
  }

  /** Lists the names of registered job schedulers. */
  async getJobSchedulers(): Promise<Array<{ name: string }>> {
    return [...this.schedulers.keys()].map((name) => ({ name }));
  }

  /** Stops and removes a registered job scheduler. */
  async removeJobScheduler(name: string): Promise<void> {
    const entry = this.schedulers.get(name);
    if (!entry) return;
    if (entry.timer) clearInterval(entry.timer);
    entry.cron?.stop();
    this.schedulers.delete(name);
  }

  /** Stops schedules and waits for in-flight jobs to finish. */
  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    for (const name of [...this.schedulers.keys()]) await this.removeJobScheduler(name);
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    this.scheduled.clear();
    this.pending.length = 0;
    for (const wake of [...this.retryWaiters]) wake();
    await Promise.allSettled(this.running);
  }
}

/** Binds a processor to an in-process queue and exposes BullMQ-compatible events. */
export class LocalWorker<T = unknown, R = unknown> {
  readonly local = true;

  constructor(
    private readonly queue: LocalQueue<T, R>,
    processor: LocalProcessor<T, R>,
    options: { concurrency?: number } = {},
  ) {
    queue.setProcessor(processor);
    queue.setConcurrency(options.concurrency ?? 1);
  }

  /** Registers a handler for queue lifecycle events. */
  on(event: string, handler: LocalEventHandler): this {
    this.queue.on(event, handler);
    return this;
  }

  /** Closes the underlying local queue. */
  async close(): Promise<void> {
    await this.queue.close();
  }
}

/** Returns whether a queue is backed by the in-process implementation. */
export function isLocalQueue(queue: unknown): queue is LocalQueue {
  return Boolean(queue && typeof queue === "object" && (queue as { local?: boolean }).local);
}

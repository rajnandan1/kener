import { spawn, type ChildProcess } from "node:child_process";
import GC from "../../global-constants.js";

declare const __CHEERIO_GUEST__: string;

const EVAL_TIMEOUT_MS = 10_000;
const EVAL_MEMORY_LIMIT_BYTES = 256 * 1024 * 1024;
const EVAL_ERROR_MAX_LENGTH = 200;
const EVAL_MESSAGE_MAX_LENGTH = 1024;
const EVAL_STATUSES = [GC.UP, GC.DOWN, GC.DEGRADED, GC.MAINTENANCE] as const;
const EVAL_MAX_RUNNING = 2;

const GUEST_PRELUDE = `(() => {
  const noop = () => {};
  globalThis.console = { log: noop, info: noop, warn: noop, error: noop, debug: noop };
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  globalThis.atob = (input) => {
    let output = "", buffer = 0, bits = 0;
    const text = String(input).replace(/[\\t\\n\\f\\r ]/g, "");
    const body = text.length % 4 === 0 ? text.replace(/==?$/, "") : text;
    if (body.length % 4 === 1) throw new Error("Invalid character");
    for (const char of body) {
      const value = alphabet.indexOf(char);
      if (value < 0) throw new Error("Invalid character");
      buffer = (buffer << 6) | value;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        output += String.fromCharCode((buffer >> bits) & 255);
      }
    }
    return output;
  };
  globalThis.btoa = (input) => {
    let output = "", buffer = 0, bits = 0;
    for (const char of String(input)) {
      const code = char.charCodeAt(0);
      if (code > 255) throw new Error("Invalid character");
      buffer = (buffer << 8) | code;
      bits += 8;
      while (bits >= 6) {
        bits -= 6;
        output += alphabet[(buffer >> bits) & 63];
      }
    }
    if (bits > 0) output += alphabet[(buffer << (6 - bits)) & 63];
    return output + "=".repeat((4 - (output.length % 4)) % 4);
  };
})();`;

const HOST_SOURCE = `
// on, not once: a message listener keeps the IPC channel ref'd, so the process lives until the host kills it.
process.on("message", (job) => {
  (async () => {
    const load = require("node:module").createRequire(job.requireFrom);
    const { newQuickJSWASMModuleFromVariant } = load("quickjs-emscripten-core");
    const variant = load("@jitl/quickjs-wasmfile-release-sync");
    const QuickJS = await newQuickJSWASMModuleFromVariant(variant.default ?? variant);
    const runtime = QuickJS.newRuntime();
    runtime.setMemoryLimit(job.memoryLimit);
    const context = runtime.newContext();
    context.unwrapResult(context.evalCode(job.prelude));
    context.setProp(context.global, "__args", context.newString(job.args));
    const pending = context.unwrapResult(context.evalCode(job.script));
    context.unwrapResult(runtime.executePendingJobs());
    const state = context.getPromiseState(pending);
    if (state.type === "pending") throw new Error("The returned promise never resolves");
    if (state.type === "rejected") {
      const error = context.dump(state.error);
      throw new Error(error?.message ?? String(error));
    }
    return context.dump(state.value);
  })().then(
    (result) =>
      process.send(
        result === undefined || (typeof result === "string" && result.length <= job.messageLimit)
          ? { result }
          : { error: "The result is too large or not valid" },
      ),
    (error) => process.send({ error: String(error?.message ?? error).slice(0, job.messageLimit) }),
  );
});
`;

function guestScript(code: string): string {
  return `(async () => {
    const modules = typeof __cheerio === "undefined" ? {} : { cheerio: __cheerio };
    const pick = (result) => (result && typeof result === "object" ? { status: result.status, latency: result.latency } : result);
    return JSON.stringify(pick(await (${code}
    )(...JSON.parse(__args), modules)));
  })()`;
}

function serializeArgs(args: unknown[]): string {
  return JSON.stringify(args, (_key, value) => (typeof value === "bigint" ? value.toString() : value));
}

let running = 0;
const waiting: (() => void)[] = [];

async function takeSlot(): Promise<void> {
  if (running < EVAL_MAX_RUNNING) {
    running++;
    return;
  }
  await new Promise<void>((resolve) => waiting.push(resolve));
}

function freeSlot(): void {
  const next = waiting.shift();
  if (next) next();
  else running--;
}

const liveChildren = new Set<ChildProcess>();
process.once("exit", () => {
  for (const child of liveChildren) child.kill("SIGKILL");
});

function holdSlotUntilGone(child: ChildProcess): void {
  let freed = false;
  const free = () => {
    if (!freed) {
      freed = true;
      liveChildren.delete(child);
      freeSlot();
    }
  };
  liveChildren.add(child);
  child.once("exit", free);
  child.on("error", () => child.pid === undefined && free());
}

// ken: one process per eval, 2 at a time (~55 ms, ~60 MiB each); reuse processes when queue waits are measured
// A process, not a Worker: per-eval Workers starve Node's shared V8 task pool (issue 928, nodejs/node#54918).
async function runInProcess(code: string, args: unknown[]): Promise<unknown> {
  await takeSlot();
  // Worker threads ran with a 4 MB V8 stack; keep it so QuickJS's own "stack overflow" check fires before V8's.
  let child: ChildProcess;
  try {
    child = spawn(process.execPath, ["--stack-size=3900", "-e", HOST_SOURCE], {
      env: { TZ: process.env.TZ },
      stdio: ["ignore", "inherit", "inherit", "ipc"],
    });
  } catch (error) {
    freeSlot();
    throw error;
  }
  holdSlotUntilGone(child);
  return new Promise((resolve, reject) => {
    const finish = (settle: () => void) => {
      clearTimeout(timer);
      child.kill("SIGKILL");
      settle();
    };
    // QuickJS's interrupt handler does not stop C builtins such as Array.prototype.join, so the host kills the process.
    const timer = setTimeout(
      () => finish(() => reject(new Error(`Timed out after ${EVAL_TIMEOUT_MS} ms`))),
      EVAL_TIMEOUT_MS,
    );
    child.once("message", ({ result, error }: { result?: unknown; error?: string }) =>
      finish(() => (error === undefined ? resolve(result) : reject(new Error(error)))),
    );
    child.on("error", (error) => finish(() => reject(error)));
    child.once("exit", () => finish(() => reject(new Error("The sandbox stopped before the eval returned"))));
    child.send(
      {
        requireFrom: import.meta.url,
        memoryLimit: EVAL_MEMORY_LIMIT_BYTES,
        messageLimit: EVAL_MESSAGE_MAX_LENGTH,
        prelude: GUEST_PRELUDE + (code.includes("cheerio") ? __CHEERIO_GUEST__ : ""),
        script: guestScript(code),
        args: serializeArgs(args),
      },
      (error) => error && finish(() => reject(error)),
    );
  });
}

function truncate(message: string): string {
  return message.length > EVAL_ERROR_MAX_LENGTH ? `${message.substring(0, EVAL_ERROR_MAX_LENGTH)}...` : message;
}

export interface EvalResult {
  status: (typeof EVAL_STATUSES)[number];
  latency?: number;
}

function isEvalStatus(value: unknown): value is EvalResult["status"] {
  return (EVAL_STATUSES as readonly unknown[]).includes(value);
}

function parseEvalResult(output: unknown): EvalResult {
  const result: { status?: unknown; latency?: unknown } | null | undefined =
    output === undefined ? undefined : JSON.parse(String(output));
  if (!result || typeof result !== "object") {
    throw new Error("Eval must return an object with 'status' and 'latency' fields, got no response");
  }
  const allowed = EVAL_STATUSES.join(", ");
  if (result.status === undefined) {
    throw new Error(`Eval must return an object with a 'status' field (one of: ${allowed}), but 'status' was missing`);
  }
  if (!isEvalStatus(result.status)) {
    throw new Error(
      `Eval returned invalid 'status' value "${truncate(String(result.status))}". Must be one of: ${allowed}`,
    );
  }
  return {
    status: result.status,
    latency: typeof result.latency === "number" ? result.latency : undefined,
  };
}

export async function RunMonitorEval(code: string, args: unknown[]): Promise<EvalResult> {
  let output: unknown;
  try {
    output = await runInProcess(code, args);
  } catch (error: unknown) {
    throw new Error(`Eval error: ${truncate(error instanceof Error ? error.message : String(error))}`);
  }
  return parseEvalResult(output);
}

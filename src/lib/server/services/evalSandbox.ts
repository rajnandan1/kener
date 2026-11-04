import { Worker } from "node:worker_threads";
import GC from "../../global-constants.js";

declare const __CHEERIO_GUEST__: string;

const EVAL_TIMEOUT_MS = 10_000;
const EVAL_MEMORY_LIMIT_BYTES = 256 * 1024 * 1024;
const EVAL_ERROR_MAX_LENGTH = 200;
const EVAL_MESSAGE_MAX_LENGTH = 1024;
const EVAL_STATUSES = [GC.UP, GC.DOWN, GC.DEGRADED, GC.MAINTENANCE] as const;

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

const WORKER_SOURCE = `
const { parentPort, workerData } = require("node:worker_threads");
const load = require("node:module").createRequire(workerData.requireFrom);
const { newQuickJSWASMModuleFromVariant } = load("quickjs-emscripten-core");
const variant = load("@jitl/quickjs-wasmfile-release-sync");

(async () => {
  const QuickJS = await newQuickJSWASMModuleFromVariant(variant.default ?? variant);
  const runtime = QuickJS.newRuntime();
  runtime.setMemoryLimit(workerData.memoryLimit);
  const context = runtime.newContext();
  context.unwrapResult(context.evalCode(workerData.prelude));
  context.setProp(context.global, "__args", context.newString(workerData.args));
  const pending = context.unwrapResult(context.evalCode(workerData.script));
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
    parentPort.postMessage(
      result === undefined || (typeof result === "string" && result.length <= workerData.messageLimit)
        ? { result }
        : { error: "The result is too large or not valid" },
    ),
  (error) => parentPort.postMessage({ error: String(error?.message ?? error).slice(0, workerData.messageLimit) }),
);
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

// ken: one worker per eval (22 ms, 5 queue slots); reuse workers when checks per minute make this measurable
function runInWorker(code: string, args: unknown[]): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(WORKER_SOURCE, {
      eval: true,
      env: {},
      workerData: {
        requireFrom: import.meta.url,
        memoryLimit: EVAL_MEMORY_LIMIT_BYTES,
        messageLimit: EVAL_MESSAGE_MAX_LENGTH,
        prelude: GUEST_PRELUDE + (code.includes("cheerio") ? __CHEERIO_GUEST__ : ""),
        script: guestScript(code),
        args: serializeArgs(args),
      },
    });
    const finish = (settle: () => void) => {
      clearTimeout(timer);
      void worker.terminate();
      settle();
    };
    // QuickJS's interrupt handler does not stop C builtins such as Array.prototype.join, so the host kills the thread.
    const timer = setTimeout(
      () => finish(() => reject(new Error(`Timed out after ${EVAL_TIMEOUT_MS} ms`))),
      EVAL_TIMEOUT_MS,
    );
    worker.once("message", ({ result, error }: { result?: unknown; error?: string }) =>
      finish(() => (error === undefined ? resolve(result) : reject(new Error(error)))),
    );
    worker.once("error", (error) => finish(() => reject(error)));
    worker.once("exit", () => finish(() => reject(new Error("The sandbox stopped before the eval returned"))));
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
    output = await runInWorker(code, args);
  } catch (error: unknown) {
    throw new Error(`Eval error: ${truncate(error instanceof Error ? error.message : String(error))}`);
  }
  return parseEvalResult(output);
}

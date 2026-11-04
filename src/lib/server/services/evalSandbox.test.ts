import { Worker } from "node:worker_threads";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as cheerio from "cheerio";
import { DefaultAPIEval, DefaultGamedigEval, DefaultPingEval, DefaultTCPEval } from "../../anywhere.js";
import { RunMonitorEval } from "./evalSandbox";

const up = `{ status: "UP", latency: 1 }`;
const realSetTimeout = setTimeout;

async function expectKillAtDeadline(code: string) {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  const assertion = expect(RunMonitorEval(code, [])).rejects.toThrow("Eval error: Timed out after 10000 ms");
  await new Promise((resolve) => realSetTimeout(resolve, 250));
  await vi.advanceTimersByTimeAsync(10_000);
  await assertion;
}

function runInNode(code: string, args: unknown[]): Promise<unknown> {
  const evalFunction = new Function("args", "modules", `return (${code}\n)(...args, modules);`);
  return evalFunction(args, { cheerio });
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("RunMonitorEval gives the same result as Node.js", () => {
  const ping = { alive: true, min: "1", max: "2", avg: "1.5", latencies: ["1"], latency: 12, host: "a", type: "IP4" };
  const tcp = { status: "open", latency: 3.5, host: "a", port: 443, type: "IP4" };
  const statusPage = `<div class="ContentBox_header__a">We’re fully operational</div>
    <div class="component-container"><span class="component-status">Operational</span></div>`;
  const cheerioHeaderEval = `async function (statusCode, responseTime, responseRaw, modules) {
    const $ = modules.cheerio.load(responseRaw);
    const header = $('[class^="ContentBox_header"]');
    return { status: header.text().includes("We’re fully operational") ? "UP" : "DOWN", latency: responseTime };
  }`;
  const cheerioEachEval = `(async function (statusCode, responseTime, responseRaw, modules) {
    const $ = modules.cheerio.load(responseRaw);
    let status = true;
    $(".component-container").each((index, element) => {
      if ($(element).find(".component-status").text().trim() !== "Operational") status = false;
    });
    return { status: status ? "UP" : "DOWN", latency: responseTime };
  })`;
  const jsonEval = `async function (statusCode, responseTime, responseRaw) {
    const todos = JSON.parse(responseRaw);
    const done = todos.filter((todo) => todo && todo.completed === true).length;
    return { status: done <= 1 ? "UP" : "DEGRADED", latency: responseTime };
  }`;
  const base64Eval = `(function (statusCode, responseTime, responseDataBase64) {
    const body = JSON.parse(atob(responseDataBase64));
    return { status: body.status, latency: responseTime };
  })`;

  it.each([
    ["DefaultAPIEval with 200", DefaultAPIEval, [200, 15, "ok"]],
    ["DefaultAPIEval with 429", DefaultAPIEval, [429, 15, "ok"]],
    ["DefaultAPIEval with 500", DefaultAPIEval, [500, 15, "no"]],
    ["DefaultPingEval", DefaultPingEval, [[ping, { ...ping, alive: false }]]],
    ["DefaultTCPEval", DefaultTCPEval, [[tcp, { ...tcp, status: "timeout" }]]],
    ["DefaultGamedigEval", DefaultGamedigEval, [40, { players: [] }]],
    ["the cheerio docs example", cheerioHeaderEval, [200, 15, statusPage]],
    ["the cheerio example from issue 420", cheerioEachEval, [200, 15, statusPage]],
    ["the JSON docs example", jsonEval, [200, 15, JSON.stringify([{ completed: true }])]],
    ["the atob example from issue 246", base64Eval, [200, 15, btoa(JSON.stringify({ status: "DEGRADED" }))]],
  ])("%s", async (_name, code, args) => {
    expect(await RunMonitorEval(code, args)).toEqual(await runInNode(code, args));
  });
});

describe("RunMonitorEval guest features", () => {
  it("keeps console, atob, and btoa", async () => {
    const code = `async () => {
      console.log("kept");
      const text = "aé~\\u00ff";
      return { status: atob(btoa(text)) === text && btoa("ab") === "YWI=" ? "UP" : "DOWN", latency: 1 };
    }`;

    expect(await RunMonitorEval(code, [])).toEqual({ status: "UP", latency: 1 });
  });

  it.each(["", "a", "ab", "abc", "abcd", "\u00ff\u00fe\u00fd", "\u0000\u0080"])(
    "gives the same btoa and atob result as Node.js for %j",
    async (text) => {
      const code = `async (text, encoded) => ({
        status: btoa(text) === encoded && atob(encoded) === text ? "UP" : "DOWN",
        latency: 1,
      })`;

      expect(await RunMonitorEval(code, [text, btoa(text)])).toEqual({ status: "UP", latency: 1 });
    },
  );

  it("ignores whitespace and missing padding in atob", async () => {
    const code = `async () => ({ status: atob(" YW\\nI ") === "ab" && atob("YWI") === "ab" ? "UP" : "DOWN", latency: 1 })`;

    expect(await RunMonitorEval(code, [])).toEqual({ status: "UP", latency: 1 });
  });

  it.each(["A", "Z=g=", "====", "YQ=", "YQ", "YQ==", "Y Q = =", "\u00a0YQ==", "a$b"])(
    "gives the same atob result as Node.js for %j",
    async (text) => {
      const decodeInNode = () => {
        try {
          return atob(text);
        } catch {
          return "threw";
        }
      };
      const code = `async (text, expected) => {
        let decoded;
        try {
          decoded = atob(text);
        } catch {
          decoded = "threw";
        }
        return { status: decoded === expected ? "UP" : "DOWN", latency: 1 };
      }`;

      expect(await RunMonitorEval(code, [text, decodeInNode()])).toEqual({ status: "UP", latency: 1 });
    },
  );

  it.each([
    ["atob", `atob("a$b")`],
    ["btoa", `btoa("\u0100")`],
  ])("rejects a character that %s cannot encode", async (_name, call) => {
    await expect(RunMonitorEval(`async () => ${call}`, [])).rejects.toThrow("Eval error: Invalid character");
  });

  it("keeps the cheerio API that evals use", async () => {
    const html = `<ul id="list"><li class="a" data-x="1">one</li><li class="b">two &amp; ü</li></ul>`;
    const code = `async function (responseRaw, modules) {
      const $ = modules.cheerio.load(responseRaw);
      const xml = modules.cheerio.load("<x><y>1</y></x>", { xml: true });
      const checks = [
        $("#list li").map((index, element) => $(element).text()).get().join("|") === "one|two & ü",
        $("li.a").attr("data-x") === "1" && $("li.a").data("x") === 1,
        $("li:contains('two')").hasClass("b"),
        $("ul:has(.a)").length === 1,
        $("li").first().next().text() === "two & ü",
        $("li").closest("ul").attr("id") === "list",
        $.html("li.a").startsWith("<li"),
        xml("y").text() === "1",
        modules.cheerio.contains($("ul")[0], $("li")[0]),
      ];
      return { status: checks.every(Boolean) ? "UP" : "DOWN", latency: checks.indexOf(false) };
    }`;

    expect(await RunMonitorEval(code, [html])).toEqual({ status: "UP", latency: -1 });
  });

  it("gives every eval a new global scope", async () => {
    await RunMonitorEval(`async () => { globalThis.leak = true; return ${up}; }`, []);

    const code = `async () => ({ status: typeof leak === "undefined" ? "UP" : "DOWN", latency: 1 })`;
    expect(await RunMonitorEval(code, [])).toEqual({ status: "UP", latency: 1 });
  });

  it("accepts an eval that ends in a line comment", async () => {
    expect(await RunMonitorEval(`async () => (${up}) // done`, [])).toEqual({ status: "UP", latency: 1 });
  });

  it("passes BigInt arguments as strings", async () => {
    const code = `async (id) => ({ status: id === "42" ? "UP" : "DOWN", latency: 1 })`;

    expect(await RunMonitorEval(code, [42n])).toEqual({ status: "UP", latency: 1 });
  });

  it("reports a missing feature by name", async () => {
    await expect(RunMonitorEval(`async () => { await fetch("http://kener.test"); return ${up}; }`, [])).rejects.toThrow(
      "Eval error: 'fetch' is not defined",
    );
  });
});

describe("RunMonitorEval result checks", () => {
  it.each([
    ["undefined", `async () => {}`, "got no response"],
    ["a string", `async () => "UP"`, "got no response"],
    ["no status", `async () => ({ latency: 1 })`, "'status' was missing"],
    ["an unknown status", `async () => ({ status: "UNKNOWN", latency: 1 })`, `invalid 'status' value "UNKNOWN"`],
    ["a status of the wrong type", `async () => ({ status: ["UP"], latency: 1 })`, `invalid 'status' value "UP"`],
  ])("rejects %s", async (_name, code, message) => {
    await expect(RunMonitorEval(code, [])).rejects.toThrow(message);
  });

  it.each([
    ["a BigInt", `1n`],
    ["a circular object", `(() => { const self = {}; self.self = self; return self; })()`],
  ])("ignores an extra property that holds %s", async (_name, extra) => {
    const code = `async () => ({ status: "UP", latency: 1, extra: ${extra} })`;

    expect(await RunMonitorEval(code, [])).toEqual({ status: "UP", latency: 1 });
  });

  it("returns no latency when the latency is not a number", async () => {
    const code = `async () => ({ status: "UP", latency: "fast" })`;

    expect(await RunMonitorEval(code, [])).toEqual({ status: "UP", latency: undefined });
  });

  it("keeps an error message of exactly 200 characters", async () => {
    const code = `async () => { throw new Error("x".repeat(200)); }`;

    await expect(RunMonitorEval(code, [])).rejects.toThrow(/^Eval error: x{200}$/);
  });

  it("cuts a long error message to 200 characters", async () => {
    const code = `async () => { throw new Error("x".repeat(500)); }`;

    await expect(RunMonitorEval(code, [])).rejects.toThrow(`Eval error: ${"x".repeat(200)}...`);
  });
});

describe("RunMonitorEval limits", () => {
  it.each([
    ["an infinite loop", `async () => { while (true) {} }`],
    [
      "an infinite promise chain",
      `async () => { const next = () => Promise.resolve().then(next); next(); return new Promise(() => {}); }`,
    ],
    ["a getter that never returns", `async () => ({ get status() { while (true) {} } })`],
    ["a C builtin that ignores interrupts", `async () => ({ length: Array(2 ** 32 - 1).join("").length })`],
  ])("kills %s at the deadline", async (_name, code) => {
    await expectKillAtDeadline(code);
  });

  it("ends the worker thread at the deadline", async () => {
    const terminate = vi.spyOn(Worker.prototype, "terminate");

    await expectKillAtDeadline(`async () => { while (true) {} }`);

    const exitCodes = await Promise.all(terminate.mock.results.map((result) => result.value));
    expect(exitCodes).toContain(1);
  });

  it("rejects a result that is too large", async () => {
    const code = `async () => ({ status: "x".repeat(2048), latency: 1 })`;

    await expect(RunMonitorEval(code, [])).rejects.toThrow("Eval error: The result is too large or not valid");
  });

  it("rejects a result that is not a JSON string", async () => {
    const code = `0)));})(); (async () => { const modules = 0; return (((() => ({ length: 1 })`;

    await expect(RunMonitorEval(code, [])).rejects.toThrow("Eval error: The result is too large or not valid");
  });

  it("reports a promise that never resolves", async () => {
    await expect(RunMonitorEval(`async () => new Promise(() => {})`, [])).rejects.toThrow(
      "Eval error: The returned promise never resolves",
    );
  });

  it("stops an eval at the memory limit", async () => {
    const code = `async () => { new ArrayBuffer(512 * 1024 * 1024); return { status: "UP", latency: 1 }; }`;

    await expect(RunMonitorEval(code, [])).rejects.toThrow("Eval error: out of memory");
  });

  it("stops unbounded recursion", async () => {
    await expect(RunMonitorEval(`function run() { return run() + 1; }`, [])).rejects.toThrow("stack overflow");
  });

  it("keeps working after an eval crashes its sandbox", async () => {
    await expect(RunMonitorEval(`async () => { const a = {}; a.a = a; return { status: a }; }`, [])).rejects.toThrow(
      "circular",
    );

    expect(await RunMonitorEval(`async () => (${up})`, [])).toEqual({ status: "UP", latency: 1 });
  });
});

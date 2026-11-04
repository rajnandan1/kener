import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import axios from "axios";
// @ts-expect-error - gamedig does not have type declarations
import { GameDig } from "gamedig";
import { Ping, TCP } from "../ping.js";
import ApiCall from "./apiCall";
import PingCall from "./pingCall";
import TcpCall from "./tcpCall";
import GamedigCall from "./gamedigCall";
import type { ApiMonitor, GamedigMonitor, PingMonitor, TcpMonitor } from "../types/monitor";

vi.mock("axios", () => ({ default: vi.fn() }));
vi.mock("../ping.js", () => ({ Ping: vi.fn(), TCP: vi.fn() }));
vi.mock("gamedig", () => ({ GameDig: { query: vi.fn() } }));

const monitorTypes: [string, (code: string) => { execute(): Promise<{ status: string; type: string }> }][] = [
  [
    "API",
    (code) =>
      new ApiCall({
        tag: "t",
        type_data: { url: "http://kener.test", method: "GET", eval: code },
      } as unknown as ApiMonitor),
  ],
  [
    "PING",
    (code) =>
      new PingCall({
        tag: "t",
        type_data: { hosts: [{ type: "IP4", host: "kener.test", timeout: 1000, count: 1 }], pingEval: code },
      } as unknown as PingMonitor),
  ],
  [
    "TCP",
    (code) =>
      new TcpCall({
        tag: "t",
        type_data: { hosts: [{ type: "IP4", host: "kener.test", port: 80, timeout: 1000 }], tcpEval: code },
      } as unknown as TcpMonitor),
  ],
  [
    "GAMEDIG",
    (code) =>
      new GamedigCall({
        tag: "t",
        type_data: { host: "kener.test", port: 1, gameId: "valve", eval: code },
      } as unknown as GamedigMonitor),
  ],
];

let directory: string;
let proof: string;

beforeAll(() => {
  directory = mkdtempSync(join(tmpdir(), "kener-eval-"));
  proof = join(directory, "proof");
});

afterAll(() => rmSync(directory, { recursive: true, force: true }));

beforeEach(() => {
  rmSync(proof, { force: true });
  vi.mocked(axios).mockResolvedValue({ status: 200, data: "ok" });
  vi.mocked(Ping).mockResolvedValue({
    alive: true,
    min: "1",
    max: "1",
    avg: "1",
    latencies: ["1"],
    latency: 1,
    host: "kener.test",
    type: "IP4",
  });
  vi.mocked(TCP).mockResolvedValue({ status: "open", latency: 1, host: "kener.test", port: 80, type: "IP4" });
  vi.mocked(GameDig.query).mockResolvedValue({ ping: 1, raw: {} });
});

describe.each(monitorTypes)("%s monitor eval", (_type, createCall) => {
  const writeFile = (getFs: string) =>
    `async function () { (${getFs}).writeFileSync(${JSON.stringify("PROOF")}, "x"); return { status: "UP", latency: 1 }; }`;

  it.each([
    ["require", `require("node:fs")`],
    ["process.getBuiltinModule", `process.getBuiltinModule("node:fs")`],
    ["dynamic import", `await import("node:fs")`],
    ["Function constructor", `(function () {}).constructor("return process")().getBuiltinModule("node:fs")`],
    ["this.constructor", `this.constructor.constructor("return process")().getBuiltinModule("node:fs")`],
  ])("cannot reach the host through %s", async (_name, getFs) => {
    const result = await createCall(writeFile(getFs).replace("PROOF", proof)).execute();

    expect(existsSync(proof)).toBe(false);
    expect(result).toMatchObject({ status: "DOWN", type: "ERROR" });
  });

  it("cannot read the server's environment", async () => {
    const code = `async function () { return { status: process.env.KENER_SECRET_KEY ? "UP" : "DEGRADED", latency: 1 }; }`;

    expect(await createCall(code).execute()).toMatchObject({ status: "DOWN", type: "ERROR" });
  });

  it("cannot save a status outside the allowed list", async () => {
    const code = `async function () { return { status: "UNKNOWN", latency: 1 }; }`;

    expect(await createCall(code).execute()).toMatchObject({ status: "DOWN", type: "ERROR" });
  });

  it("ends a promise that never resolves", async () => {
    const code = `async function () { return new Promise(() => {}); }`;

    expect(await createCall(code).execute()).toMatchObject({ status: "DOWN", type: "ERROR" });
  });

  it("saves the status and latency that a valid eval returns", async () => {
    const code = `async function () { return { status: "DEGRADED", latency: 7 }; }`;

    expect(await createCall(code).execute()).toMatchObject({ status: "DEGRADED", latency: 7, type: "REALTIME" });
  });

  it("reports DOWN when the eval has a syntax error", async () => {
    expect(await createCall("async function ( {").execute()).toMatchObject({ status: "DOWN", type: "ERROR" });
  });
});

describe("eval results on PING, TCP, and GAMEDIG monitors", () => {
  const createCall = Object.fromEntries(monitorTypes);
  const withoutLatency = `async function () { return { status: "UP" }; }`;
  const valid = `async function () { return { status: "UP", latency: 7 }; }`;

  it.each(["PING", "TCP", "GAMEDIG"])("%s saves a latency of 0 when the eval fails", async (type) => {
    expect(await createCall[type]("async function ( {").execute()).toMatchObject({ status: "DOWN", latency: 0 });
  });

  it.each(["PING", "GAMEDIG"])("%s saves a latency of 0 when the eval returns none", async (type) => {
    expect(await createCall[type](withoutLatency).execute()).toMatchObject({ status: "UP", latency: 0 });
  });

  it("TCP reports DOWN when the eval returns no latency", async () => {
    expect(await createCall.TCP(withoutLatency).execute()).toMatchObject({ status: "DOWN", type: "ERROR" });
  });

  it.each(["PING", "TCP"])("%s saves no error when every host answers", async (type) => {
    expect(await createCall[type](valid).execute()).toMatchObject({ error_message: undefined });
  });

  it.each(["PING", "TCP", "GAMEDIG"])("%s runs the default eval when the monitor has none", async (type) => {
    expect(await createCall[type]("").execute()).toMatchObject({ status: "UP", type: "REALTIME" });
  });

  it.each([
    ["PING", () => new PingCall({ tag: "t", type_data: {} } as unknown as PingMonitor)],
    ["TCP", () => new TcpCall({ tag: "t", type_data: {} } as unknown as TcpMonitor)],
  ])("%s reports DOWN when the monitor has no hosts", async (_type, createMonitor) => {
    expect(await createMonitor().execute()).toMatchObject({ status: "DOWN", latency: 0, type: "ERROR" });
  });

  it("GAMEDIG reports a failed query and cuts a long message to 200 characters", async () => {
    vi.mocked(GameDig.query).mockRejectedValue(new Error("x".repeat(500)));

    expect(await createCall.GAMEDIG(valid).execute()).toEqual({
      status: "DOWN",
      latency: 0,
      type: "ERROR",
      error_message: `${"x".repeat(200)}...`,
    });
  });

  it("GAMEDIG reports a query that fails with a plain string", async () => {
    vi.mocked(GameDig.query).mockRejectedValue("offline");

    expect(await createCall.GAMEDIG(valid).execute()).toMatchObject({ status: "DOWN", error_message: "offline" });
  });

  it("GAMEDIG passes the monitor's timeout to the query", async () => {
    const call = new GamedigCall({
      tag: "t",
      type_data: { host: "kener.test", port: 1, gameId: "valve", timeout: 1234, eval: valid },
    } as unknown as GamedigMonitor);

    await call.execute();

    expect(GameDig.query).toHaveBeenLastCalledWith(expect.objectContaining({ attemptTimeout: 1234 }));
  });

  it("PING keeps the message of an unreachable host", async () => {
    vi.mocked(Ping).mockResolvedValue({
      alive: false,
      min: "0",
      max: "0",
      avg: "0",
      latencies: [],
      latency: 0,
      host: "kener.test",
      type: "IP4",
    });

    expect(await createCall.PING(valid).execute()).toMatchObject({
      status: "UP",
      error_message: "Host kener.test is unreachable.",
    });
  });

  it("TCP keeps the message of a closed port", async () => {
    vi.mocked(TCP).mockResolvedValue({ status: "timeout", latency: 0, host: "kener.test", port: 80, type: "IP4" });

    expect(await createCall.TCP(valid).execute()).toMatchObject({
      status: "UP",
      error_message: "Host kener.test:80 is timeout",
    });
  });
});

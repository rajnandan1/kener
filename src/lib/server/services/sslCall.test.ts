import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import type { SslMonitor } from "../types/monitor";

const { mockConnect } = vi.hoisted(() => ({
  mockConnect: vi.fn(),
}));

vi.mock("tls", () => ({
  default: { connect: mockConnect },
  connect: mockConnect,
}));

import SSLCall, { DEFAULT_SSL_TIMEOUT_MS, dnAttr } from "./sslCall";

class FakeSocket extends EventEmitter {
  destroyed = false;
  authorized = true;
  authorizationError: string | undefined;
  peerCert: { valid_to?: string; issuer?: { CN?: string | string[]; O?: string | string[] } } = {};

  getPeerCertificate() {
    return this.peerCert;
  }

  destroy() {
    this.destroyed = true;
  }
}

function makeMonitor(overrides: Partial<SslMonitor["type_data"]> = {}): SslMonitor {
  return {
    tag: "ssl-test",
    type_data: { host: "example.com", port: "443", degradedRemainingHours: 168, downRemainingHours: 24, ...overrides },
  };
}

function connectedSocket(hoursUntilExpiry: number, authorizationError?: string): FakeSocket {
  const socket = new FakeSocket();
  socket.peerCert = {
    valid_to: new Date(Date.now() + hoursUntilExpiry * 3_600_000).toUTCString(),
    issuer: { CN: "R3", O: "Let's Encrypt" },
  };
  if (authorizationError) {
    socket.authorized = false;
    socket.authorizationError = authorizationError;
  }
  mockConnect.mockImplementation((_opts: unknown, cb: () => void) => {
    queueMicrotask(cb);
    return socket;
  });
  return socket;
}

beforeEach(() => {
  mockConnect.mockReset();
});

describe("SSLCall.execute", () => {
  it("stores the TLS handshake time as latency, not the time until expiry", async () => {
    const socket = connectedSocket(200);
    const r = await new SSLCall(makeMonitor()).execute();

    expect(r).toMatchObject({
      status: "UP",
      type: "REALTIME",
      issuer_cn: "R3",
      issuer_o: "Let's Encrypt",
      cert_trusted: true,
    });
    expect(r.latency).toBeGreaterThanOrEqual(0);
    expect(r.latency).toBeLessThan(DEFAULT_SSL_TIMEOUT_MS);
    expect(Date.parse(r.expiry_at!) - Date.now()).toBeGreaterThan(199 * 3_600_000);
    expect(r.error_message).toBeUndefined();
    expect(socket.destroyed).toBe(true);
  });

  it("connects with SNI set to the host and checks trust itself", async () => {
    connectedSocket(400);
    await new SSLCall(makeMonitor()).execute();
    expect(mockConnect.mock.calls[0][0]).toEqual({
      host: "example.com",
      port: 443,
      servername: "example.com",
      rejectUnauthorized: false,
    });
  });

  it("returns DEGRADED inside the degraded window with expiry and issuer in the message", async () => {
    connectedSocket(48);
    const r = await new SSLCall(makeMonitor()).execute();
    expect(r).toMatchObject({ status: "DEGRADED", type: "REALTIME" });
    expect(r.error_message).toMatch(/expires at .* Issued by CN=R3, O=Let's Encrypt$/);
  });

  it("returns DOWN inside the down window", async () => {
    connectedSocket(12);
    const r = await new SSLCall(makeMonitor()).execute();
    expect(r).toMatchObject({ status: "DOWN", type: "REALTIME" });
    expect(r.latency).toBeLessThan(DEFAULT_SSL_TIMEOUT_MS);
  });

  it("returns DOWN with the expiry for an untrusted certificate", async () => {
    connectedSocket(400, "DEPTH_ZERO_SELF_SIGNED_CERT");
    const r = await new SSLCall(makeMonitor()).execute();
    expect(r).toMatchObject({ status: "DOWN", type: "ERROR", latency: 0, issuer_cn: "R3", cert_trusted: false });
    expect(r.expiry_at).toBeTruthy();
    expect(r.error_message).toMatch(/is not trusted: DEPTH_ZERO_SELF_SIGNED_CERT\./);
  });

  it("returns DOWN with a past expiry for an expired certificate", async () => {
    connectedSocket(-5, "CERT_HAS_EXPIRED");
    const r = await new SSLCall(makeMonitor()).execute();
    expect(r).toMatchObject({ status: "DOWN", type: "ERROR" });
    expect(Date.parse(r.expiry_at!)).toBeLessThan(Date.now());
  });

  it("judges an untrusted certificate by expiry alone when allowSelfSignedCert is on", async () => {
    connectedSocket(400, "DEPTH_ZERO_SELF_SIGNED_CERT");
    const r = await new SSLCall(makeMonitor({ allowSelfSignedCert: true })).execute();
    expect(r).toMatchObject({ status: "UP", type: "REALTIME", cert_trusted: false });
  });

  it("maps socket errors to DOWN / ERROR and destroys the socket", async () => {
    const socket = new FakeSocket();
    mockConnect.mockImplementation(() => {
      queueMicrotask(() => socket.emit("error", new Error("getaddrinfo ENOTFOUND example.com")));
      return socket;
    });
    const r = await new SSLCall(makeMonitor()).execute();
    expect(r).toMatchObject({ status: "DOWN", type: "ERROR", latency: 0 });
    expect(r.expiry_at).toBeUndefined();
    expect(socket.destroyed).toBe(true);
  });

  it("maps a slow handshake to DOWN / TIMEOUT and destroys the socket", async () => {
    vi.useFakeTimers();
    const socket = new FakeSocket();
    mockConnect.mockImplementation(() => socket);

    const pending = new SSLCall(makeMonitor({ timeout: 50 })).execute();
    await vi.advanceTimersByTimeAsync(50);
    const r = await pending;
    vi.useRealTimers();

    expect(r).toMatchObject({ status: "DOWN", type: "TIMEOUT", error_message: "SSL check timed out after 50ms" });
    expect(socket.destroyed).toBe(true);
  });

  it("falls back to the default timeout when the configured one is out of range", async () => {
    vi.useFakeTimers();
    mockConnect.mockImplementation(() => new FakeSocket());

    const pending = new SSLCall(makeMonitor({ timeout: 3_000_000_000 })).execute();
    await vi.advanceTimersByTimeAsync(DEFAULT_SSL_TIMEOUT_MS);
    const r = await pending;
    vi.useRealTimers();

    expect(r.error_message).toBe(`SSL check timed out after ${DEFAULT_SSL_TIMEOUT_MS}ms`);
  });

  it("sends the tlsServername override as SNI for an IP host", async () => {
    connectedSocket(400);
    await new SSLCall(makeMonitor({ host: "1.2.3.4", port: "8443", tlsServername: "cdn.example.com" })).execute();
    expect(mockConnect.mock.calls[0][0]).toMatchObject({ host: "1.2.3.4", port: 8443, servername: "cdn.example.com" });
  });

  it("sends no SNI for a bare IP host", async () => {
    connectedSocket(400);
    await new SSLCall(makeMonitor({ host: "8.8.8.8" })).execute();
    expect(mockConnect.mock.calls[0][0].servername).toBeUndefined();
  });

  it("returns DOWN / ERROR without connecting when thresholds are not numbers", async () => {
    const r = await new SSLCall(makeMonitor({ degradedRemainingHours: Number.NaN })).execute();
    expect(r).toMatchObject({ status: "DOWN", type: "ERROR" });
    expect(mockConnect).not.toHaveBeenCalled();
  });
});

describe("dnAttr", () => {
  it("normalizes string and array DN attributes", () => {
    expect(dnAttr(" Let's Encrypt ")).toBe("Let's Encrypt");
    expect(dnAttr(["A", "B"])).toBe("A, B");
    expect(dnAttr(undefined)).toBeNull();
    expect(dnAttr("")).toBeNull();
  });
});

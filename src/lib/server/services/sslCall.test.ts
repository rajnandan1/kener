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

import SSLCall, { DEFAULT_SSL_TIMEOUT_MS, SSLTimeoutError } from "./sslCall";

class FakeSocket extends EventEmitter {
  destroyed = false;
  peerCert: {
    valid_to?: string;
    issuer?: { CN?: string | string[]; O?: string | string[] };
  } = {};

  getPeerCertificate() {
    return this.peerCert;
  }

  destroy() {
    this.destroyed = true;
  }

  end() {
    this.destroy();
  }
}

function makeMonitor(overrides: Partial<SslMonitor["type_data"]> = {}): SslMonitor {
  return {
    tag: "ssl-test",
    type_data: {
      host: "example.com",
      port: "443",
      degradedRemainingHours: 168,
      downRemainingHours: 24,
      ...overrides,
    },
  };
}

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toUTCString();
}

function certWithIssuer(hoursUntilExpiry: number) {
  return {
    valid_to: hoursFromNow(hoursUntilExpiry),
    issuer: { CN: "R3", O: "Let's Encrypt" },
  };
}

beforeEach(() => {
  mockConnect.mockReset();
});

describe("SSLCall.execute", () => {
  it("stores remaining lifetime (ms) as latency and returns issuer CN/O", async () => {
    const socket = new FakeSocket();
    socket.peerCert = certWithIssuer(200);
    mockConnect.mockImplementation((_opts: unknown, cb: () => void) => {
      queueMicrotask(cb);
      return socket;
    });

    const r = await new SSLCall(makeMonitor()).execute();
    expect(r.status).toBe("UP");
    expect(r.type).toBe("REALTIME");
    expect(r.expiry_at).toBeTruthy();
    expect(r.issuer_cn).toBe("R3");
    expect(r.issuer_o).toBe("Let's Encrypt");
    expect(r.error_message).toMatch(/Issued by CN=R3, O=Let's Encrypt/);
    // ~200 hours in ms (allow clock skew in the test)
    expect(r.latency).toBeGreaterThan(199 * 3600 * 1000);
    expect(r.latency).toBeLessThan(201 * 3600 * 1000);
    expect(socket.destroyed).toBe(true);
  });

  it("returns DEGRADED when within the degraded window and includes issuer in the message", async () => {
    const socket = new FakeSocket();
    socket.peerCert = certWithIssuer(48);
    mockConnect.mockImplementation((_opts: unknown, cb: () => void) => {
      queueMicrotask(cb);
      return socket;
    });

    const r = await new SSLCall(makeMonitor()).execute();
    expect(r.status).toBe("DEGRADED");
    expect(r.type).toBe("REALTIME");
    expect(r.error_message).toMatch(/expires at/);
    expect(r.error_message).toMatch(/Issued by CN=R3, O=Let's Encrypt/);
    expect(r.latency).toBeGreaterThan(47 * 3600 * 1000);
  });

  it("returns DOWN when within the down window", async () => {
    const socket = new FakeSocket();
    socket.peerCert = certWithIssuer(12);
    mockConnect.mockImplementation((_opts: unknown, cb: () => void) => {
      queueMicrotask(cb);
      return socket;
    });

    const r = await new SSLCall(makeMonitor()).execute();
    expect(r.status).toBe("DOWN");
    expect(r.type).toBe("REALTIME");
    expect(r.latency).toBeGreaterThan(0);
    expect(r.issuer_cn).toBe("R3");
  });

  it("clamps expired remaining time to 0 when allowSelfSignedCert lets it through", async () => {
    const socket = new FakeSocket();
    socket.peerCert = certWithIssuer(-5);
    mockConnect.mockImplementation((opts: { rejectUnauthorized?: boolean }, cb: () => void) => {
      expect(opts.rejectUnauthorized).toBe(false);
      queueMicrotask(cb);
      return socket;
    });

    const r = await new SSLCall(makeMonitor({ allowSelfSignedCert: true })).execute();
    expect(r.status).toBe("DOWN");
    expect(r.latency).toBe(0);
    expect(r.error_message).toMatch(/expired at/);
  });

  it("maps socket errors to ERROR / DOWN and destroys the socket", async () => {
    const socket = new FakeSocket();
    mockConnect.mockImplementation(() => {
      queueMicrotask(() => socket.emit("error", new Error("certificate has expired")));
      return socket;
    });

    const r = await new SSLCall(makeMonitor()).execute();
    expect(r.status).toBe("DOWN");
    expect(r.type).toBe("ERROR");
    expect(r.error_message).toMatch(/certificate has expired/);
    expect(socket.destroyed).toBe(true);
  });

  it("maps timeouts to TIMEOUT and destroys the socket", async () => {
    vi.useFakeTimers();
    const socket = new FakeSocket();
    mockConnect.mockImplementation(() => socket);

    const pending = new SSLCall(makeMonitor({ timeout: 50 })).execute();
    await vi.advanceTimersByTimeAsync(50);
    const r = await pending;

    expect(r.status).toBe("DOWN");
    expect(r.type).toBe("TIMEOUT");
    expect(r.error_message).toMatch(/timed out after 50ms/);
    expect(socket.destroyed).toBe(true);
    vi.useRealTimers();
  });

  it("passes SNI override into tls.connect", async () => {
    const socket = new FakeSocket();
    socket.peerCert = certWithIssuer(400);
    mockConnect.mockImplementation((opts: Record<string, unknown>, cb: () => void) => {
      expect(opts.host).toBe("1.2.3.4");
      expect(opts.port).toBe(8443);
      expect(opts.servername).toBe("cdn.example.com");
      expect(opts.rejectUnauthorized).toBe(true);
      queueMicrotask(cb);
      return socket;
    });

    await new SSLCall(
      makeMonitor({
        host: "1.2.3.4",
        port: "8443",
        tlsServername: "cdn.example.com",
      }),
    ).execute();

    expect(mockConnect).toHaveBeenCalled();
  });

  it("omits servername for bare IP hosts when tlsServername is unset", async () => {
    const socket = new FakeSocket();
    socket.peerCert = certWithIssuer(400);
    mockConnect.mockImplementation((opts: Record<string, unknown>, cb: () => void) => {
      expect(opts.servername).toBeUndefined();
      queueMicrotask(cb);
      return socket;
    });

    await new SSLCall(makeMonitor({ host: "8.8.8.8" })).execute();
  });

  it("returns ERROR when thresholds are not finite", async () => {
    const r = await new SSLCall(
      makeMonitor({ degradedRemainingHours: Number.NaN, downRemainingHours: 24 }),
    ).execute();
    expect(r.status).toBe("DOWN");
    expect(r.type).toBe("ERROR");
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it("exposes the shared default timeout constant", () => {
    expect(DEFAULT_SSL_TIMEOUT_MS).toBe(10000);
    expect(new SSLTimeoutError(10).name).toBe("SSLTimeoutError");
  });
});

describe("dnAttr", () => {
  it("normalizes string and array DN attributes", async () => {
    const { dnAttr } = await import("./sslCall");
    expect(dnAttr(" Let's Encrypt ")).toBe("Let's Encrypt");
    expect(dnAttr(["A", "B"])).toBe("A, B");
    expect(dnAttr(undefined)).toBeNull();
    expect(dnAttr("")).toBeNull();
  });
});

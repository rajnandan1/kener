import { describe, it, expect } from "vitest";
import { IsValidDnsResolver, ResolveSslExpiresAtMs, IsSslCertificateExpired } from "./clientTools";

describe("IsValidDnsResolver", () => {
  it("accepts valid IPv4, IPv6, and hostnames", () => {
    expect(IsValidDnsResolver("8.8.8.8")).toBe(true);
    expect(IsValidDnsResolver("2001:4860:4860::8888")).toBe(true);
    expect(IsValidDnsResolver("dns.google")).toBe(true);
  });

  it("rejects malformed IPv4 forms via the shared validator", () => {
    // Zero-padded octets and out-of-range values must not pass the IPv4 path.
    expect(IsValidDnsResolver("0000000000001.0.0.0")).toBe(false);
    expect(IsValidDnsResolver("256.0.0.1")).toBe(false);
    expect(IsValidDnsResolver("not a resolver")).toBe(false);
  });
});

describe("ResolveSslExpiresAtMs", () => {
  it("prefers stored expiry_at over latency", () => {
    const expiryIso = "2020-01-01T00:00:00.000Z";
    expect(
      ResolveSslExpiresAtMs({
        timestamp: 1_700_000_000,
        latency: 86_400_000,
        expiry_at: expiryIso,
      }),
    ).toBe(Date.parse(expiryIso));
  });

  it("falls back to timestamp+latency only when remaining > 0", () => {
    expect(
      ResolveSslExpiresAtMs({
        timestamp: 1_700_000_000,
        latency: 5_000,
      }),
    ).toBe(1_700_000_000 * 1000 + 5_000);
  });

  it("treats latency 0 as already expired at check time (not SECURED)", () => {
    const ts = 1_700_000_000;
    const expiresAt = ResolveSslExpiresAtMs({ timestamp: ts, latency: 0 });
    expect(expiresAt).toBe(ts * 1000);
    expect(IsSslCertificateExpired(expiresAt)).toBe(true);
  });
});

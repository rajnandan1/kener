import { describe, it, expect } from "vitest";
import {
  IsValidDnsResolver,
  ParseLatency,
  ResolveSslExpiresAtMs,
  GetSslSecurityState,
  FormatSslRemaining,
} from "./clientTools";

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

describe("SSL certificate state", () => {
  const now = Date.parse("2026-01-01T00:00:00.000Z");
  const day = 86_400_000;

  it("reads the expiry only from expiry_at", () => {
    expect(ResolveSslExpiresAtMs({ expiry_at: "2026-03-01T00:00:00.000Z" })).toBe(
      Date.parse("2026-03-01T00:00:00.000Z"),
    );
    expect(ResolveSslExpiresAtMs({ expiry_at: null })).toBeNull();
    expect(ResolveSslExpiresAtMs({ expiry_at: "not a date" })).toBeNull();
    expect(ResolveSslExpiresAtMs(null)).toBeNull();
  });

  it("maps future, past, and missing expiry to secured, insecure, and unknown", () => {
    expect(GetSslSecurityState(now + day, now)).toBe("secured");
    expect(GetSslSecurityState(now - 1, now)).toBe("insecure");
    expect(GetSslSecurityState(now, now)).toBe("insecure");
    expect(GetSslSecurityState(null, now)).toBe("unknown");
    expect(GetSslSecurityState(now + day, now, false)).toBe("insecure");
    expect(GetSslSecurityState(null, now, false)).toBe("unknown");
  });

  it("formats remaining time in days, hours under a day, and 0h after expiry", () => {
    expect(FormatSslRemaining(now + 80.5 * day, now)).toBe("80.5d");
    expect(FormatSslRemaining(now + 5 * 3_600_000, now)).toBe("5.0h");
    expect(FormatSslRemaining(now - day, now)).toBe("0.0h");
    expect(FormatSslRemaining(null, now)).toBe("");
  });

  it("leaves ParseLatency unchanged for values above one day", () => {
    expect(ParseLatency(2 * day)).toBe("48.00h");
  });
});

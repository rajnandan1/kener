import { describe, it, expect } from "vitest";
import { IsValidDnsResolver } from "./clientTools";

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

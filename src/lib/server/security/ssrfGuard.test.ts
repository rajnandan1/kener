import { describe, expect, it } from "vitest";
import { isBlockedAddress } from "./ssrfGuard";

describe("isBlockedAddress", () => {
  it("blocks IPv4 loopback, private, link-local/metadata ranges", () => {
    expect(isBlockedAddress("127.0.0.1")).toBe(true);
    expect(isBlockedAddress("10.1.2.3")).toBe(true);
    expect(isBlockedAddress("172.16.0.5")).toBe(true);
    expect(isBlockedAddress("172.31.255.255")).toBe(true);
    expect(isBlockedAddress("192.168.1.1")).toBe(true);
    expect(isBlockedAddress("169.254.169.254")).toBe(true); // cloud metadata
    expect(isBlockedAddress("0.0.0.0")).toBe(true);
    expect(isBlockedAddress("100.64.0.1")).toBe(true); // CGNAT
  });

  it("allows public IPv4 addresses", () => {
    expect(isBlockedAddress("8.8.8.8")).toBe(false);
    expect(isBlockedAddress("1.1.1.1")).toBe(false);
    expect(isBlockedAddress("93.184.216.34")).toBe(false);
  });

  it("blocks native IPv6 loopback/link-local/ULA/multicast", () => {
    expect(isBlockedAddress("::1")).toBe(true);
    expect(isBlockedAddress("fe80::1")).toBe(true);
    expect(isBlockedAddress("fc00::1")).toBe(true);
    expect(isBlockedAddress("fd12:3456:789a::1")).toBe(true);
    expect(isBlockedAddress("ff02::1")).toBe(true);
  });

  it("blocks IPv4-mapped IPv6 encodings of private/metadata addresses", () => {
    expect(isBlockedAddress("::ffff:127.0.0.1")).toBe(true);
    expect(isBlockedAddress("::ffff:169.254.169.254")).toBe(true);
    expect(isBlockedAddress("::ffff:10.0.0.1")).toBe(true);
  });

  it("blocks 6to4 encodings of private/metadata addresses", () => {
    // 2002:0a00:0001:: encodes 10.0.0.1
    expect(isBlockedAddress("2002:0a00:0001::")).toBe(true);
    // 2002:a9fe:a9fe:: encodes 169.254.169.254
    expect(isBlockedAddress("2002:a9fe:a9fe::")).toBe(true);
  });

  it("allows 6to4 encoding of a public address", () => {
    // 2002:0808:0808:: encodes 8.8.8.8
    expect(isBlockedAddress("2002:0808:0808::")).toBe(false);
  });

  it("blocks NAT64 well-known-prefix encodings of private/metadata addresses", () => {
    // 64:ff9b::169.254.169.254
    expect(isBlockedAddress("64:ff9b::169.254.169.254")).toBe(true);
    expect(isBlockedAddress("64:ff9b::10.0.0.1")).toBe(true);
  });

  it("allows NAT64 encoding of a public address", () => {
    expect(isBlockedAddress("64:ff9b::8.8.8.8")).toBe(false);
  });

  it("allows a public IPv6 address", () => {
    expect(isBlockedAddress("2606:4700:4700::1111")).toBe(false); // Cloudflare DNS
  });

  it("fails closed on unparsable input", () => {
    expect(isBlockedAddress("not-an-ip")).toBe(true);
  });
});

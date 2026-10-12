import dns from "node:dns";
import net from "node:net";

/**
 * Blocks outbound monitor requests from reaching loopback, private, link-local,
 * or other non-public-unicast network destinations, including ones reachable only
 * via an IPv4-mapped, 6to4, or NAT64 IPv6 encoding, or only after following a
 * redirect to a different host.
 *
 * Monitor configuration (URL and proxy) is attacker-controlled relative to this
 * guard's trust boundary: any holder of an ACTIVE API key, or any authenticated
 * user able to create/edit a monitor, can point a monitor at an arbitrary
 * destination. Without this guard, that destination can be the host's own
 * loopback interface, an internal/private network address, or a cloud metadata
 * endpoint (e.g. 169.254.169.254), and the probe's response is echoed back
 * through the monitor's eval output and status page.
 *
 * Resolution happens once, at actual connection time, via the `lookup` option
 * axios/Node's http(s) transport calls for every TCP connection it opens,
 * including each hop of a redirect chain (follow-redirects reuses the same
 * request options, `lookup` included, for every redirect). The guard resolves
 * every A/AAAA record for the hostname, rejects the connection if ANY of them is
 * blocked, and otherwise pins the connection to the first validated address so a
 * second internal DNS query cannot rebind to a different (possibly internal)
 * address between validation and connect (DNS rebinding).
 */

const IPV4_MAPPED_RE = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i;

function parseIPv4(addr: string): number[] | null {
  const parts = addr.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return nums;
}

function isBlockedIPv4(addr: string): boolean {
  const octets = parseIPv4(addr);
  if (!octets) return true; // unparsable -> fail closed
  const [a, b, c] = octets;

  if (a === 0) return true; // 0.0.0.0/8 "this network"
  if (a === 10) return true; // 10.0.0.0/8 private
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local, incl. cloud metadata 169.254.169.254
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a === 192 && b === 0 && c === 0) return true; // 192.0.0.0/24 IETF protocol assignments (incl. NAT64 well-known /96 overlap space)
  if (a === 192 && b === 0 && c === 2) return true; // 192.0.2.0/24 TEST-NET-1
  if (a === 198 && b === 18) return true; // 198.18.0.0/15 benchmarking
  if (a === 198 && b === 19) return true;
  if (a === 198 && b === 51 && c === 100) return true; // 198.51.100.0/24 TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // 203.0.113.0/24 TEST-NET-3
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 shared address space (CGNAT)
  if (a >= 224) return true; // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved + 255.255.255.255 broadcast
  return false;
}

/** Expands a (possibly compressed, possibly IPv4-mapped) IPv6 address into 8 16-bit groups. */
function expandIPv6(addr: string): number[] | null {
  let a = addr;
  if (a.startsWith("[") && a.endsWith("]")) a = a.slice(1, -1);

  // An embedded IPv4 tail (e.g. "::ffff:1.2.3.4" or "64:ff9b::1.2.3.4") is converted
  // to its two equivalent hex groups before the normal 8-group expansion.
  const v4TailMatch = a.match(/(^|:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (v4TailMatch) {
    const octets = parseIPv4(v4TailMatch[2]);
    if (!octets) return null;
    const hex1 = ((octets[0] << 8) | octets[1]).toString(16);
    const hex2 = ((octets[2] << 8) | octets[3]).toString(16);
    a = a.slice(0, a.length - v4TailMatch[2].length) + hex1 + ":" + hex2;
  }

  const parts = a.split("::");
  if (parts.length > 2) return null;

  const head = parts[0] ? parts[0].split(":").filter((s) => s.length > 0) : [];
  const tail = parts.length === 2 && parts[1] ? parts[1].split(":").filter((s) => s.length > 0) : [];

  let groups: string[];
  if (parts.length === 2) {
    const missing = 8 - head.length - tail.length;
    if (missing < 0) return null;
    groups = [...head, ...Array(missing).fill("0"), ...tail];
  } else {
    groups = head;
  }
  if (groups.length !== 8) return null;

  const nums = groups.map((g) => parseInt(g, 16));
  if (nums.some((n) => Number.isNaN(n) || n < 0 || n > 0xffff)) return null;
  return nums;
}

function groupsToIPv4(groups: number[], startGroup: number): string {
  const hi = groups[startGroup];
  const lo = groups[startGroup + 1];
  return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
}

function isBlockedIPv6(addr: string): boolean {
  const lower = addr.toLowerCase();

  // IPv4-mapped (::ffff:a.b.c.d) handled directly before expansion for clarity.
  const mapped = lower.match(IPV4_MAPPED_RE);
  if (mapped) return isBlockedIPv4(mapped[1]);

  const groups = expandIPv6(lower);
  if (!groups) return true; // unparsable -> fail closed

  const isZero = (n: number[], from: number, to: number) => n.slice(from, to).every((g) => g === 0);

  // :: (unspecified) and ::1 (loopback)
  if (isZero(groups, 0, 8)) return true;
  if (isZero(groups, 0, 7) && groups[7] === 1) return true;

  // IPv4-compatible (::a.b.c.d, deprecated) and IPv4-mapped reached via full expansion.
  if (isZero(groups, 0, 5) && (groups[5] === 0 || groups[5] === 0xffff)) {
    return isBlockedIPv4(groupsToIPv4(groups, 6));
  }

  // 6to4: 2002:WWXX:YYZZ::/16 embeds the IPv4 address in groups[1..2].
  if (groups[0] === 0x2002) {
    return isBlockedIPv4(groupsToIPv4(groups, 1));
  }

  // NAT64 well-known prefix 64:ff9b::/96 embeds the IPv4 address in the last two groups.
  if (groups[0] === 0x0064 && groups[1] === 0xff9b && isZero(groups, 2, 6)) {
    return isBlockedIPv4(groupsToIPv4(groups, 6));
  }

  // fe80::/10 link-local
  if (groups[0] >= 0xfe80 && groups[0] <= 0xfebf) return true;
  // fc00::/7 unique local
  if (groups[0] >= 0xfc00 && groups[0] <= 0xfdff) return true;
  // ff00::/8 multicast
  if (groups[0] >= 0xff00 && groups[0] <= 0xffff) return true;
  // 2001:db8::/32 documentation
  if (groups[0] === 0x2001 && groups[1] === 0x0db8) return true;
  // 2001::/32 Teredo
  if (groups[0] === 0x2001 && groups[1] === 0) return true;
  // 100::/64 discard-only
  if (groups[0] === 0x0100 && isZero(groups, 1, 4)) return true;

  return false;
}

export function isBlockedAddress(address: string, family?: number): boolean {
  if (family === 6 || address.includes(":")) return isBlockedIPv6(address);
  return isBlockedIPv4(address);
}

type LookupAllResult = Array<{ address: string; family: number }>;

/**
 * A drop-in replacement for Node's `dns.lookup`, suitable for axios's `lookup`
 * config option. Resolves every A/AAAA record for the hostname, rejects if any
 * resolved address is blocked, and otherwise pins the connection to the first
 * validated address.
 */
type SsrfLookupCallback = (err: Error | null, address: string, family?: 4 | 6) => void;

export function createSsrfSafeLookup() {
  return function ssrfSafeLookup(hostname: string, _options: object, cb: SsrfLookupCallback): void {
    dns.lookup(hostname, { all: true }, (err, addresses) => {
      if (err) {
        cb(err, "");
        return;
      }
      const list = addresses as unknown as LookupAllResult;
      if (!list || list.length === 0) {
        cb(Object.assign(new Error(`SSRF guard: DNS lookup for "${hostname}" returned no addresses`), { code: "ENOTFOUND" }), "");
        return;
      }
      const blocked = list.find((a) => isBlockedAddress(a.address, a.family));
      if (blocked) {
        cb(
          Object.assign(
            new Error(
              `SSRF guard: refusing to connect to "${hostname}" (resolves to disallowed address ${blocked.address})`,
            ),
            { code: "EHOSTUNREACH" },
          ),
          "",
        );
        return;
      }
      const chosen = list[0];
      cb(null, chosen.address, chosen.family as 4 | 6);
    });
  };
}

/**
 * Synchronously rejects a hostname that is already a literal IP address and
 * resolves to a blocked range.
 *
 * Node's connection layer (`net.Socket.connect`, used by both the initial request
 * and every `follow-redirects` hop) checks `net.isIP(host)` BEFORE doing anything
 * else, and when the host is already a literal IP it connects to it directly,
 * skipping the `lookup` option entirely. A `lookup`-based guard therefore never
 * sees a URL/redirect whose host is already an IP literal (e.g.
 * `http://169.254.169.254/`), so that case has to be checked separately, up
 * front, for the initial URL and again for every redirect hop (via axios's
 * `beforeRedirect`, which runs synchronously and can throw to abort the hop).
 */
export function assertLiteralIpIsAllowed(hostname: string): void {
  const family = net.isIP(hostname);
  if (family === 0) return; // not a literal IP; the `lookup`-based guard covers it
  if (isBlockedAddress(hostname, family)) {
    throw new Error(`SSRF guard: refusing to connect to disallowed address ${hostname}`);
  }
}

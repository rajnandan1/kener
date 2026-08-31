import dns2 from "dns2";
import dgram, { type Socket } from "dgram";
import tls from "tls";
import { Resolver as NodeResolver } from "node:dns/promises";
import { AllRecordTypes, IsValidHost } from "../clientTools";

interface DNSAnswer {
  name: string;
  ttl: number;
  address?: string;
  ns?: string;
  domain?: string;
  exchange?: string;
  priority?: number;
  data?: unknown;
}

interface DNSResponse {
  answers: DNSAnswer[];
}

interface DNSRecordResult {
  name: string;
  type: string;
  ttl: number;
  data: unknown;
}

export interface DnsQueryOptions {
  transport?: "UDP" | "TLS";
  nameserverOverride?: string;
  tlsPort?: number;
  tlsServername?: string;
  allowSelfSignedCert?: boolean;
  timeoutMs?: number;
}

const DEFAULT_DOT_PORT = 853;
const DEFAULT_QUERY_TIMEOUT_MS = 3000;

class DNSResolver {
  nameserver: string;
  socket: Socket | null;

  constructor() {
    this.nameserver = "8.8.8.8";
    this.socket = null;
  }

  private getUdpSocket(): Socket {
    if (!this.socket) {
      this.socket = dgram.createSocket("udp4");
    }
    return this.socket;
  }

  createQuery(domain: string, type: string): InstanceType<typeof dns2.Packet> {
    const packet = new dns2.Packet();
    // @ts-expect-error dns2 types are incomplete
    packet.header.id = 1;
    // @ts-expect-error dns2 types are incomplete
    packet.header.rd = 1;
    // @ts-expect-error dns2 types are incomplete
    packet.questions.push({
      name: domain,
      type: AllRecordTypes[type as keyof typeof AllRecordTypes],
      class: 1,
    });
    return packet;
  }

  private resolveTlsServername(nameserver: string, tlsServername?: string): string | undefined {
    const configuredServername = tlsServername?.trim();
    if (configuredServername) {
      return configuredServername;
    }
    if (IsValidHost(nameserver)) {
      return nameserver;
    }
    return undefined;
  }

  async query(domain: string, recordType: string, nameserverOverride?: string): Promise<DNSResponse> {
    const socket = this.getUdpSocket();
    return new Promise((resolve, reject) => {
      const query = this.createQuery(domain, recordType);
      const buffer = query.toBuffer();
      const targetNameserver = nameserverOverride || this.nameserver;
      const timeoutMs = DEFAULT_QUERY_TIMEOUT_MS;

      const onMessage = (message: Buffer) => {
        clearTimeout(timeoutId);
        socket.removeListener("message", onMessage);
        try {
          // @ts-expect-error dns2 types are incomplete
          const response = dns2.Packet.parse(message) as DNSResponse;
          resolve(response);
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      };

      const timeoutId = setTimeout(() => {
        socket.removeListener("message", onMessage);
        socket.close();
        if (this.socket === socket) {
          this.socket = null;
        }
        reject(new Error(`DNS query timed out for ${domain} (${recordType}) via ${targetNameserver}`));
      }, timeoutMs);

      socket.once("message", onMessage);

      socket.send(buffer, 0, buffer.length, 53, targetNameserver, (err: Error | null) => {
        if (err) {
          clearTimeout(timeoutId);
          socket.removeListener("message", onMessage);
          reject(err);
        }
      });
    });
  }

  async queryOverTls(
    domain: string,
    recordType: string,
    nameserver: string,
    options: Pick<DnsQueryOptions, "tlsPort" | "tlsServername" | "allowSelfSignedCert" | "timeoutMs"> = {},
  ): Promise<DNSResponse> {
    const query = this.createQuery(domain, recordType);
    const buffer = query.toBuffer();
    const lengthPrefix = Buffer.alloc(2);
    lengthPrefix.writeUInt16BE(buffer.length, 0);
    const message = Buffer.concat([lengthPrefix, buffer]);
    const port = options.tlsPort ?? DEFAULT_DOT_PORT;
    const timeoutMs = options.timeoutMs ?? DEFAULT_QUERY_TIMEOUT_MS;
    const servername = this.resolveTlsServername(nameserver, options.tlsServername);

    return new Promise((resolve, reject) => {
      let responseBuffer = Buffer.alloc(0);
      let expectedLength: number | null = null;

      const socket = tls.connect({
        host: nameserver,
        port,
        servername,
        rejectUnauthorized: !options.allowSelfSignedCert,
      });

      const timeoutId = setTimeout(() => {
        socket.destroy();
        reject(new Error(`DNS-over-TLS query timed out for ${domain} (${recordType}) via ${nameserver}:${port}`));
      }, timeoutMs);

      const cleanup = () => {
        clearTimeout(timeoutId);
      };

      socket.on("error", (err) => {
        cleanup();
        socket.destroy();
        reject(err);
      });

      socket.on("data", (chunk: Buffer) => {
        responseBuffer = Buffer.concat([responseBuffer, chunk]);

        if (expectedLength === null && responseBuffer.length >= 2) {
          expectedLength = responseBuffer.readUInt16BE(0);
        }

        if (expectedLength !== null && responseBuffer.length >= expectedLength + 2) {
          cleanup();
          const responseData = responseBuffer.subarray(2, 2 + expectedLength);
          try {
            // @ts-expect-error dns2 types are incomplete
            const response = dns2.Packet.parse(responseData) as DNSResponse;
            socket.destroy();
            resolve(response);
          } catch (error) {
            socket.destroy();
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        }
      });

      socket.on("secureConnect", () => {
        socket.write(message);
      });
    });
  }

  async getAuthoritativeNameServers(domain: string, resolverNameserver?: string): Promise<string[]> {
    const resolver = new NodeResolver();
    resolver.setServers([resolverNameserver || this.nameserver]);

    const labels = domain.replace(/\.$/, "").split(".");
    for (let i = 0; i <= labels.length - 2; i++) {
      const zone = labels.slice(i).join(".");
      try {
        const nameServers = await resolver.resolveNs(zone);
        if (nameServers.length > 0) {
          return nameServers;
        }
      } catch {
        // Try parent zone
      }
    }

    return [];
  }

  async queryAuthoritativeRecord(
    domain: string,
    recordType: string,
    fallbackNameserver?: string,
  ): Promise<DNSResponse> {
    const authoritativeNameServers = await this.getAuthoritativeNameServers(domain, fallbackNameserver);

    for (const ns of authoritativeNameServers) {
      try {
        const response = await this.query(domain, recordType, ns);
        if (response.answers && response.answers.length > 0) {
          return response;
        }
      } catch {
        // Try next authoritative nameserver
      }
    }

    // Fallback to configured recursive resolver
    return await this.query(domain, recordType, fallbackNameserver);
  }

  extractData(answer: DNSAnswer, recordType: string): unknown {
    switch (recordType) {
      case "A":
      case "AAAA":
        return answer.address;
      case "NS":
        return answer.ns;
      case "CNAME":
        return answer.domain;
      case "MX":
        return answer.exchange;
      default:
        return answer.data;
    }
  }

  async getRecord(
    domain: string,
    recordType: string,
    options: DnsQueryOptions = {},
  ): Promise<Record<string, DNSRecordResult[]>> {
    const results: Record<string, DNSRecordResult[]> = {};
    const transport = options.transport ?? "UDP";
    const nameserverOverride = options.nameserverOverride?.trim() || undefined;

    try {
      let response: DNSResponse;

      if (transport === "TLS") {
        if (!nameserverOverride) {
          throw new Error("Name server is required for DNS-over-TLS queries");
        }

        response = await this.queryOverTls(domain, recordType, nameserverOverride, {
          tlsPort: options.tlsPort,
          tlsServername: options.tlsServername,
          allowSelfSignedCert: options.allowSelfSignedCert,
          timeoutMs: options.timeoutMs,
        });
      } else {
        response = await this.queryAuthoritativeRecord(domain, recordType, nameserverOverride);
      }

      results[recordType] = response.answers.map((answer: DNSAnswer) => ({
        name: answer.name,
        type: recordType,
        ttl: answer.ttl,
        data: this.extractData(answer, recordType),
      }));
      return results;
    } catch (error) {
      console.error("Error querying DNS records:", error);
      throw error;
    } finally {
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }
    }
  }
}

export default DNSResolver;

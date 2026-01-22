import dns2 from "dns2";
import dgram, { type Socket } from "dgram";
import { AllRecordTypes } from "./constants.js";

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

class DNSResolver {
  nameserver: string;
  socket: Socket;

  constructor(nameserver = "8.8.8.8") {
    this.nameserver = nameserver;
    this.socket = dgram.createSocket("udp4");
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

  async query(domain: string, recordType: string): Promise<DNSResponse> {
    return new Promise((resolve, reject) => {
      const query = this.createQuery(domain, recordType);
      const buffer = query.toBuffer();

      this.socket.on("message", (message: Buffer) => {
        // @ts-expect-error dns2 types are incomplete
        const response = dns2.Packet.parse(message) as DNSResponse;
        resolve(response);
      });

      this.socket.send(buffer, 0, buffer.length, 53, this.nameserver, (err: Error | null) => {
        if (err) reject(err);
      });
    });
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
        return {
          exchange: answer.exchange,
          priority: answer.priority,
        };
      default:
        return answer.data;
    }
  }

  async getRecord(domain: string, recordType: string): Promise<Record<string, DNSRecordResult[]>> {
    const results: Record<string, DNSRecordResult[]> = {};

    try {
      const response = await this.query(domain, recordType);
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
      this.socket.close();
    }
  }
}

export default DNSResolver;

import tls from "tls";
import net from "net";
import GC from "../../global-constants.js";
import { performance } from "node:perf_hooks";
import type { SslMonitor, MonitoringResult } from "../types/monitor.js";

export const DEFAULT_SSL_TIMEOUT_MS = 10000;

/** Thrown when the TLS handshake or certificate read exceeds the configured timeout. */
export class SSLTimeoutError extends Error {
  /** @param timeoutMs - Timeout budget that was exceeded. */
  constructor(timeoutMs: number) {
    super(`SSL check timed out after ${timeoutMs}ms`);
    this.name = "SSLTimeoutError";
  }
}

interface SSLExpiryResult {
  domain: string;
  expiryDate: Date;
  timeTillExpiryMs: number;
  handshakeMs: number;
  issuerCn: string | null;
  issuerO: string | null;
}

export interface GetSSLExpiryOptions {
  port?: number;
  timeoutMs?: number;
  /** SNI name; when omitted, uses `domain` unless `domain` is an IP. */
  servername?: string;
  rejectUnauthorized?: boolean;
}

/** Normalize a certificate DN attribute that may be a string or string[]. */
export function dnAttr(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    const parts = value.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((v) => v.trim());
    return parts.length > 0 ? parts.join(", ") : null;
  }
  return null;
}

/** Build a short `Issued by CN=..., O=...` note for logs and last_status. */
function formatIssuerLine(issuerCn: string | null, issuerO: string | null): string | undefined {
  const parts: string[] = [];
  if (issuerCn) parts.push(`CN=${issuerCn}`);
  if (issuerO) parts.push(`O=${issuerO}`);
  return parts.length > 0 ? `Issued by ${parts.join(", ")}` : undefined;
}

/**
 * Open a TLS connection and read the leaf certificate expiry + issuer.
 * Always destroys the socket on settle (success, error, or timeout).
 */
export const getSSLExpiry = (domain: string, options: GetSSLExpiryOptions = {}): Promise<SSLExpiryResult> => {
  const port = options.port ?? 443;
  const timeoutMs = options.timeoutMs ?? DEFAULT_SSL_TIMEOUT_MS;
  const rejectUnauthorized = options.rejectUnauthorized ?? true;
  const servername = options.servername || (net.isIP(domain) ? undefined : domain);

  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let socket: tls.TLSSocket;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (timer !== undefined) clearTimeout(timer);
      fn();
      socket.destroy();
    };

    socket = tls.connect(
      {
        host: domain,
        port,
        servername,
        rejectUnauthorized,
      },
      () => {
        const cert = socket.getPeerCertificate();
        if (!cert || !cert.valid_to) {
          settle(() => reject(new Error("No certificate found.")));
          return;
        }
        const handshakeMs = Math.round(performance.now() - startTime);
        const timeTillExpiryMs = new Date(cert.valid_to).getTime() - Date.now();
        settle(() =>
          resolve({
            domain,
            expiryDate: new Date(cert.valid_to),
            timeTillExpiryMs,
            handshakeMs,
            issuerCn: dnAttr(cert.issuer?.CN),
            issuerO: dnAttr(cert.issuer?.O),
          }),
        );
      },
    );

    timer = setTimeout(() => {
      settle(() => reject(new SSLTimeoutError(timeoutMs)));
    }, timeoutMs);

    socket.on("error", (err) => {
      settle(() => reject(err));
    });
  });
};

/** Runs a configured SSL/TLS certificate monitor check. */
class SSLCall {
  monitor: SslMonitor;

  /** @param monitor - Active SSL monitor definition. */
  constructor(monitor: SslMonitor) {
    this.monitor = monitor;
  }

  /** Probe the host, evaluate remaining lifetime thresholds, and return a MonitoringResult. */
  async execute(): Promise<MonitoringResult> {
    const domain = this.monitor.type_data.host;
    const port = parseInt(this.monitor.type_data.port || "443", 10);
    const degradedRemainingHours = Number(this.monitor.type_data.degradedRemainingHours);
    const downRemainingHours = Number(this.monitor.type_data.downRemainingHours);
    const timeoutMs =
      typeof this.monitor.type_data.timeout === "number" && Number.isFinite(this.monitor.type_data.timeout)
        ? this.monitor.type_data.timeout
        : DEFAULT_SSL_TIMEOUT_MS;
    const rejectUnauthorized = !this.monitor.type_data.allowSelfSignedCert;
    const servername = this.monitor.type_data.tlsServername?.trim() || undefined;

    if (!Number.isFinite(degradedRemainingHours) || !Number.isFinite(downRemainingHours)) {
      return {
        status: GC.DOWN,
        latency: 0,
        type: GC.ERROR,
        error_message: "SSL monitor has invalid degraded/down hour thresholds",
      };
    }

    if (!Number.isFinite(port) || port < 1 || port > 65535) {
      return {
        status: GC.DOWN,
        latency: 0,
        type: GC.ERROR,
        error_message: `Invalid SSL port: ${this.monitor.type_data.port}`,
      };
    }

    try {
      const { timeTillExpiryMs, expiryDate, issuerCn, issuerO } = await getSSLExpiry(domain, {
        port,
        timeoutMs,
        servername,
        rejectUnauthorized,
      });
      const timeTillExpiryHours = timeTillExpiryMs / 1000 / 60 / 60;
      // Intentionally store remaining lifetime (ms) as the chart/log metric so the
      // "latency" trend is a certificate expiry countdown, not TLS handshake RTT.
      const latency = Math.max(0, Math.round(timeTillExpiryMs));
      const expiresAt = expiryDate.toISOString();
      const issuerLine = formatIssuerLine(issuerCn, issuerO);
      const sslMeta = {
        expiry_at: expiresAt,
        issuer_cn: issuerCn,
        issuer_o: issuerO,
      };

      if (timeTillExpiryHours > degradedRemainingHours) {
        return {
          status: GC.UP,
          latency,
          type: GC.REALTIME,
          ...sslMeta,
          // Persist issuer on UP so recent logs / last-status can show Issued by CN/O
          error_message: issuerLine,
        };
      } else if (timeTillExpiryHours > downRemainingHours) {
        return {
          status: GC.DEGRADED,
          latency,
          type: GC.REALTIME,
          ...sslMeta,
          error_message: [
            `SSL certificate for ${domain} expires at ${expiresAt} (in ${timeTillExpiryHours.toFixed(2)} hours).`,
            issuerLine,
          ]
            .filter(Boolean)
            .join(" "),
        };
      } else {
        return {
          status: GC.DOWN,
          latency,
          type: GC.REALTIME,
          ...sslMeta,
          error_message: [
            timeTillExpiryHours <= 0
              ? `SSL certificate for ${domain} expired at ${expiresAt}.`
              : `SSL certificate for ${domain} expires at ${expiresAt} (in ${timeTillExpiryHours.toFixed(2)} hours).`,
            issuerLine,
          ]
            .filter(Boolean)
            .join(" "),
        };
      }
    } catch (error: unknown) {
      let errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.length > 200) {
        errorMessage = errorMessage.substring(0, 200) + "...";
      }
      console.log(`Error checking SSL for ${domain}:`, errorMessage);
      const isTimeout = error instanceof SSLTimeoutError;
      return {
        status: GC.DOWN,
        latency: 0,
        type: isTimeout ? GC.TIMEOUT : GC.ERROR,
        error_message: errorMessage,
      };
    }
  }
}

export default SSLCall;

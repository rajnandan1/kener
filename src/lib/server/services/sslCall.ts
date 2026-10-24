import tls from "tls";
import net from "net";
import GC from "../../global-constants.js";
import { performance } from "node:perf_hooks";
import type { SslMonitor, MonitoringResult } from "../types/monitor.js";

export const DEFAULT_SSL_TIMEOUT_MS = 10000;

export class SSLTimeoutError extends Error {
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
  /** Why the chain or host name failed verification; null when the certificate is trusted. */
  authorizationError: string | null;
}

export interface GetSSLExpiryOptions {
  port?: number;
  timeoutMs?: number;
  /** SNI name; when omitted, uses `domain` unless `domain` is an IP. */
  servername?: string;
}

/** Node returns a DN attribute as string[] when the certificate repeats it. */
export function dnAttr(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    const parts = value.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((v) => v.trim());
    return parts.length > 0 ? parts.join(", ") : null;
  }
  return null;
}

function formatIssuerLine(issuerCn: string | null, issuerO: string | null): string | undefined {
  const parts: string[] = [];
  if (issuerCn) parts.push(`CN=${issuerCn}`);
  if (issuerO) parts.push(`O=${issuerO}`);
  return parts.length > 0 ? `Issued by ${parts.join(", ")}` : undefined;
}

/**
 * Reads the leaf certificate even when verification fails, so an expired or untrusted
 * certificate still reports its expiry. Callers decide what an authorizationError means.
 */
export const getSSLExpiry = (domain: string, options: GetSSLExpiryOptions = {}): Promise<SSLExpiryResult> => {
  const port = options.port ?? 443;
  const timeoutMs = options.timeoutMs ?? DEFAULT_SSL_TIMEOUT_MS;
  const servername = options.servername || (net.isIP(domain) ? undefined : domain);

  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (timer !== undefined) clearTimeout(timer);
      fn();
      socket.destroy();
    };

    // Node still runs chain and host name checks with rejectUnauthorized: false; it reports them on socket.authorized.
    const socket = tls.connect({ host: domain, port, servername, rejectUnauthorized: false }, () => {
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
          authorizationError: socket.authorized ? null : String(socket.authorizationError || "UNKNOWN_ERROR"),
        }),
      );
    });

    timer = setTimeout(() => {
      settle(() => reject(new SSLTimeoutError(timeoutMs)));
    }, timeoutMs);

    socket.on("error", (err) => {
      settle(() => reject(err));
    });
  });
};

class SSLCall {
  monitor: SslMonitor;

  constructor(monitor: SslMonitor) {
    this.monitor = monitor;
  }

  async execute(): Promise<MonitoringResult> {
    const domain = String(this.monitor.type_data.host ?? "").trim();
    const port = parseInt(this.monitor.type_data.port || "443", 10);
    const degradedRemainingHours = Number(this.monitor.type_data.degradedRemainingHours);
    const downRemainingHours = Number(this.monitor.type_data.downRemainingHours);
    const configuredTimeout = Number(this.monitor.type_data.timeout);
    // setTimeout fires at once for delays above 2^31-1 ms.
    const timeoutMs =
      configuredTimeout >= 1 && configuredTimeout <= 2_147_483_647 ? configuredTimeout : DEFAULT_SSL_TIMEOUT_MS;
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
      const { timeTillExpiryMs, expiryDate, handshakeMs, issuerCn, issuerO, authorizationError } = await getSSLExpiry(
        domain,
        { port, timeoutMs, servername },
      );
      const timeTillExpiryHours = timeTillExpiryMs / 1000 / 60 / 60;
      const expiresAt = expiryDate.toISOString();
      const certificate = {
        expiry_at: expiresAt,
        issuer_cn: issuerCn,
        issuer_o: issuerO,
        cert_trusted: !authorizationError,
      };
      const issuerLine = formatIssuerLine(issuerCn, issuerO);

      if (authorizationError && !this.monitor.type_data.allowSelfSignedCert) {
        return {
          ...certificate,
          status: GC.DOWN,
          latency: 0,
          type: GC.ERROR,
          error_message: [`SSL certificate for ${domain} is not trusted: ${authorizationError}.`, issuerLine]
            .filter(Boolean)
            .join(" "),
        };
      }

      const expiryLine =
        timeTillExpiryHours <= 0
          ? `SSL certificate for ${domain} expired at ${expiresAt}.`
          : `SSL certificate for ${domain} expires at ${expiresAt} (in ${timeTillExpiryHours.toFixed(2)} hours).`;
      const warning = [expiryLine, issuerLine].filter(Boolean).join(" ");
      const checked = { ...certificate, latency: handshakeMs, type: GC.REALTIME };

      if (timeTillExpiryHours > degradedRemainingHours) {
        return { ...checked, status: GC.UP };
      } else if (timeTillExpiryHours > downRemainingHours) {
        return { ...checked, status: GC.DEGRADED, error_message: warning };
      } else {
        return { ...checked, status: GC.DOWN, error_message: warning };
      }
    } catch (error: unknown) {
      let errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.length > 200) {
        errorMessage = errorMessage.substring(0, 200) + "...";
      }
      console.log(`Error checking SSL for ${domain}:`, errorMessage);
      return {
        status: GC.DOWN,
        latency: 0,
        type: error instanceof SSLTimeoutError ? GC.TIMEOUT : GC.ERROR,
        error_message: errorMessage,
      };
    }
  }
}

export default SSLCall;

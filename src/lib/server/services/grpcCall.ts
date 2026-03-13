import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { writeFileSync, unlinkSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { performance } from "node:perf_hooks";
import GC from "../../global-constants.js";
import type { GrpcMonitor, MonitoringResult } from "../types/monitor.js";

// Standard gRPC Health Checking Protocol proto definition (grpc.health.v1).
// Embedded as a string to avoid file-path issues in bundled production builds.
const HEALTH_PROTO = `syntax = "proto3";

package grpc.health.v1;

message HealthCheckRequest {
  string service = 1;
}

message HealthCheckResponse {
  enum ServingStatus {
    UNKNOWN = 0;
    SERVING = 1;
    NOT_SERVING = 2;
    SERVICE_UNKNOWN = 3;
  }
  ServingStatus status = 1;
}

service Health {
  rpc Check(HealthCheckRequest) returns (HealthCheckResponse);
  rpc Watch(HealthCheckRequest) returns (stream HealthCheckResponse);
}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedProto: any = null;

function getHealthProto() {
  if (!cachedProto) {
    const tmpDir = mkdtempSync(path.join(tmpdir(), "kener-grpc-"));
    const protoPath = path.join(tmpDir, "health.proto");
    writeFileSync(protoPath, HEALTH_PROTO);
    const packageDef = protoLoader.loadSync(protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });
    cachedProto = grpc.loadPackageDefinition(packageDef);
    unlinkSync(protoPath);
  }
  return cachedProto;
}

class GrpcCall {
  monitor: GrpcMonitor;

  constructor(monitor: GrpcMonitor) {
    this.monitor = monitor;
  }

  async execute(): Promise<MonitoringResult> {
    const { host, port, service, tls, timeout } = this.monitor.type_data;
    const timeoutMs = timeout || 10000;
    const target = `${host}:${port}`;

    const start = performance.now();

    try {
      const proto = getHealthProto();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const healthService = (proto.grpc as any).health.v1.Health;

      const credentials = tls ? grpc.credentials.createSsl() : grpc.credentials.createInsecure();
      const client = new healthService(target, credentials);
      const deadline = new Date(Date.now() + timeoutMs);

      const result = await new Promise<{ status: string }>((resolve, reject) => {
        client.Check(
          { service: service || "" },
          { deadline },
          (err: grpc.ServiceError | null, response: { status: string }) => {
            client.close();
            if (err) {
              reject(err);
            } else {
              resolve(response);
            }
          },
        );
      });

      const latency = Math.round(performance.now() - start);

      if (result.status === "SERVING") {
        return {
          status: GC.UP,
          latency,
          type: GC.REALTIME,
        };
      } else if (result.status === "NOT_SERVING") {
        return {
          status: GC.DOWN,
          latency,
          type: GC.REALTIME,
          error_message: `Service status: ${result.status}`,
        };
      } else {
        return {
          status: GC.DEGRADED,
          latency,
          type: GC.REALTIME,
          error_message: `Service status: ${result.status}`,
        };
      }
    } catch (err: unknown) {
      const latency = Math.round(performance.now() - start);
      const error = err as { code?: number; details?: string; message?: string };

      let errorMessage = error.details || error.message || "Unknown gRPC error";
      let isTimeout = false;

      if (error.code === grpc.status.DEADLINE_EXCEEDED) {
        isTimeout = true;
        errorMessage = "Request timed out";
      }

      return {
        status: GC.DOWN,
        latency,
        type: isTimeout ? GC.TIMEOUT : GC.ERROR,
        error_message: errorMessage,
      };
    }
  }
}

export default GrpcCall;

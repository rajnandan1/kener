// Shared TCP monitor types: safe to import from both server and client.

import type { PingHostType } from "$lib/types/ping.js";

export interface TcpHost {
  type: PingHostType;
  host: string;
  port: number;
  timeout: number;
}

export interface TcpMonitorTypeData {
  hosts: TcpHost[];
  tcpEval?: string;
}

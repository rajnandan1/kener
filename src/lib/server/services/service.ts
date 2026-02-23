import ApiCall from "./apiCall.js";
import PingCall from "./pingCall.js";
import TcpCall from "./tcpCall.js";
import DnsCall from "./dnsCall.js";
import GroupCall from "./groupCall.js";
import SSLCall from "./sslCall.js";
import SqlCall from "./sqlCall.js";
import HeartbeatCall from "./heartbeatCall.js";
import GamedigCall from "./gamedigCall.js";
import NoneCall from "./noneCall.js";

import type {
  ApiMonitor,
  PingMonitor,
  TcpMonitor,
  DnsMonitor,
  GroupMonitor,
  SslMonitor,
  SqlMonitor,
  HeartbeatMonitor,
  GamedigMonitor,
  MonitoringResult,
  NoneMonitor,
} from "../types/monitor.js";

type ServiceCall =
  | ApiCall
  | PingCall
  | TcpCall
  | DnsCall
  | GroupCall
  | SSLCall
  | SqlCall
  | HeartbeatCall
  | GamedigCall
  | NoneCall;

export interface MonitorWithType {
  tag: string;
  monitor_type: string;
  type_data: unknown;
  cron?: string;
}

class Service {
  service: ServiceCall;

  constructor(monitor: MonitorWithType) {
    if (monitor.monitor_type === "API") {
      this.service = new ApiCall(monitor as ApiMonitor);
    } else if (monitor.monitor_type === "PING") {
      this.service = new PingCall(monitor as PingMonitor);
    } else if (monitor.monitor_type === "TCP") {
      this.service = new TcpCall(monitor as TcpMonitor);
    } else if (monitor.monitor_type === "DNS") {
      this.service = new DnsCall(monitor as DnsMonitor);
    } else if (monitor.monitor_type === "GROUP") {
      this.service = new GroupCall(monitor as GroupMonitor);
    } else if (monitor.monitor_type === "SSL") {
      this.service = new SSLCall(monitor as SslMonitor);
    } else if (monitor.monitor_type === "SQL") {
      this.service = new SqlCall(monitor as SqlMonitor);
    } else if (monitor.monitor_type === "HEARTBEAT") {
      this.service = new HeartbeatCall(monitor as HeartbeatMonitor);
    } else if (monitor.monitor_type === "GAMEDIG") {
      this.service = new GamedigCall(monitor as GamedigMonitor);
    } else {
      this.service = new NoneCall(monitor as NoneMonitor);
    }
  }
  async execute(startOfMinute?: number): Promise<MonitoringResult | null> {
    if (this.service === null) {
      return null;
    }
    return await this.service.execute(startOfMinute);
  }
}

export default Service;

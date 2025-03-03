// @ts-nocheck
import ApiCall from "./apiCall.js";
import PingCall from "./pingCall.js";
import TcpCall from "./tcpCall.js";
import DnsCall from "./dnsCall.js";
import GroupCall from "./groupCall.js";
import SSLCall from "./sslCall.js";
import SqlCall from "./sqlCall.js";
import HeartbeatCall from "./heartbeatCall.js";

class Service {
  service;

  constructor(monitor) {
    if (monitor.monitor_type === "API") {
      this.service = new ApiCall(monitor);
    } else if (monitor.monitor_type === "PING") {
      this.service = new PingCall(monitor);
    } else if (monitor.monitor_type === "TCP") {
      this.service = new TcpCall(monitor);
    } else if (monitor.monitor_type === "DNS") {
      this.service = new DnsCall(monitor);
    } else if (monitor.monitor_type === "NONE") {
      this.service = null;
    } else if (monitor.monitor_type === "GROUP") {
      this.service = new GroupCall(monitor);
    } else if (monitor.monitor_type === "SSL") {
      this.service = new SSLCall(monitor);
    } else if (monitor.monitor_type === "SQL") {
      this.service = new SqlCall(monitor);
    } else if (monitor.monitor_type === "HEARTBEAT") {
      this.service = new HeartbeatCall(monitor);
    } else {
      console.log("Invalid monitor.monitor_type ", monitor.monitor_type);
      process.exit(1);
    }
  }
  async execute(...p) {
    return await this.service.execute(...p);
  }
}

export default Service;

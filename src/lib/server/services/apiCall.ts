import axios, { type AxiosRequestConfig } from "axios";
import { GetRequiredSecrets, ReplaceAllOccurrences } from "../tool.js";
import { UP, DOWN, DEGRADED, REALTIME, TIMEOUT, ERROR, MANUAL } from "../constants.js";
import * as cheerio from "cheerio";
import { DefaultAPIEval } from "../../anywhere.js";
import version from "../../version.js";
import https from "https";
import type { ApiMonitor, EvalResponse, MonitoringResult } from "../types/monitor.js";

class ApiCall {
  monitor: ApiMonitor;
  envSecrets: Array<{ find: string; replace: string | undefined }>;

  constructor(monitor: ApiMonitor) {
    this.monitor = monitor;
    this.envSecrets = GetRequiredSecrets(
      `${monitor.type_data.url} ${monitor.type_data.body || ""} ${JSON.stringify(monitor.type_data.headers || [])}`,
    );
  }

  async execute(): Promise<MonitoringResult> {
    let axiosHeaders: Record<string, string> = {};
    axiosHeaders["User-Agent"] = `Kener/${version()}`;
    axiosHeaders["Accept"] = "*/*";

    let body = this.monitor.type_data.body;
    let url = this.monitor.type_data.url;

    //headers to string
    let headers: string | Array<{ key: string; value: string }> = "";
    if (!!this.monitor.type_data.headers) {
      headers = JSON.stringify(this.monitor.type_data.headers);
    }

    let method = this.monitor.type_data.method;
    let timeout = this.monitor.type_data.timeout || 10000;
    let tag = this.monitor.tag;

    let monitorEval = !!this.monitor.type_data.eval ? this.monitor.type_data.eval : DefaultAPIEval;

    for (let i = 0; i < this.envSecrets.length; i++) {
      const secret = this.envSecrets[i];
      if (secret.replace === undefined) continue;
      if (!!body) {
        body = ReplaceAllOccurrences(body, secret.find, secret.replace);
      }
      if (!!url) {
        url = ReplaceAllOccurrences(url, secret.find, secret.replace);
      }
      if (!!headers && typeof headers === "string") {
        headers = ReplaceAllOccurrences(headers, secret.find, secret.replace);
      }
    }

    if (!!headers && typeof headers === "string") {
      try {
        const parsedHeaders: Array<{ key: string; value: string }> = JSON.parse(headers);
        const headersObj = parsedHeaders.reduce<Record<string, string>>((acc, header) => {
          acc[header.key] = header.value;
          return acc;
        }, {});
        axiosHeaders = { ...axiosHeaders, ...headersObj };
      } catch (e) {
        console.log(e);
      }
    }

    const options: AxiosRequestConfig = {
      method: method,
      headers: axiosHeaders,
      timeout: timeout,
      transformResponse: (r: string) => r,
      maxRedirects: 5,
      validateStatus: () => true,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    };

    // Always configure HTTPS agent for better connection handling
    const httpsAgentOptions: https.AgentOptions = {
      keepAlive: true,
      keepAliveMsecs: 30000,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: timeout,
      rejectUnauthorized: !this.monitor.type_data.allowSelfSignedCert,
    };

    options.httpsAgent = new https.Agent(httpsAgentOptions);

    if (!!body) {
      options.data = body;
    }
    let statusCode = 500;
    let latency = 0;
    let errorMessage = "";
    let resp = "";
    let timeoutError = false;
    const start = Date.now();
    try {
      let data = await axios(url, options);
      statusCode = data.status;
      resp = data.data;
    } catch (err: unknown) {
      const error = err as {
        code?: string;
        message?: string;
        response?: { status?: number; data?: string };
      };
      errorMessage = error.message || "Unknown error";
      // Better timeout detection
      if (error.code === "ECONNABORTED" || (error.message && error.message.includes("timeout"))) {
        timeoutError = true;
        errorMessage = "Request timed out";
      }

      if (error.response?.status !== undefined) {
        statusCode = error.response.status;
      }
      if (error.response?.data !== undefined) {
        resp = error.response.data;
      } else {
        resp = error.message || "";
      }
    } finally {
      const end = Date.now();
      latency = end - start;
      if (resp === undefined || resp === null) {
        resp = "";
      }
    }

    let evalResp: EvalResponse | undefined = undefined;
    let modules = { cheerio };

    try {
      const evalFunction = new Function(
        "statusCode",
        "responseTime",
        "responseRaw",
        "modules",
        `return (${monitorEval})(statusCode, responseTime, responseRaw, modules);`,
      );
      evalResp = await evalFunction(statusCode, latency, resp, modules);
    } catch (error: unknown) {
      errorMessage += ` | Eval error: ${(error as Error).message}`;
    }

    if (evalResp === undefined || evalResp === null) {
      evalResp = {
        status: DOWN,
        latency: latency,
        type: ERROR,
      };
    } else if (
      evalResp.status === undefined ||
      evalResp.status === null ||
      [UP, DOWN, DEGRADED].indexOf(evalResp.status) === -1
    ) {
      evalResp = {
        status: DOWN,
        latency: latency,
        type: ERROR,
      };
    } else {
      evalResp.type = REALTIME;
    }

    let toWrite: MonitoringResult = {
      status: DOWN,
      latency: latency,
      type: ERROR,
      error_message: errorMessage,
    };
    if (evalResp.status !== undefined && evalResp.status !== null) {
      toWrite.status = evalResp.status;
    }
    if (evalResp.latency !== undefined && evalResp.latency !== null) {
      toWrite.latency = evalResp.latency;
    }
    if (evalResp.type !== undefined && evalResp.type !== null) {
      toWrite.type = evalResp.type;
    }
    if (timeoutError) {
      toWrite.type = TIMEOUT;
    }

    return toWrite;
  }
}

export default ApiCall;

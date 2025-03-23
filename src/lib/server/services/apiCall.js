// @ts-nocheck
import axios from "axios";
import { GetRequiredSecrets, ReplaceAllOccurrences } from "../tool.js";
import { UP, DOWN, DEGRADED, REALTIME, TIMEOUT, ERROR, MANUAL } from "../constants.js";
import * as cheerio from "cheerio";
import { DefaultAPIEval } from "../../anywhere.js";
import version from "../../version.js";
import https from "https";

class ApiCall {
  monitor;
  envSecrets;

  constructor(monitor) {
    this.monitor = monitor;
    this.envSecrets = GetRequiredSecrets(
      `${monitor.type_data.url} ${monitor.type_data.body} ${JSON.stringify(monitor.type_data.headers)}`,
    );
  }

  async execute() {
    let axiosHeaders = {};
    axiosHeaders["User-Agent"] = `Kener/${version()}`;
    axiosHeaders["Accept"] = "*/*";

    let body = this.monitor.type_data.body;
    let url = this.monitor.type_data.url;

    //headers to string
    let headers = "";
    if (!!this.monitor.type_data.headers) {
      headers = JSON.stringify(this.monitor.type_data.headers);
    }

    let method = this.monitor.type_data.method;
    let timeout = this.monitor.type_data.timeout || 10000;
    let tag = this.monitor.tag;

    let monitorEval = !!this.monitor.type_data.eval ? this.monitor.type_data.eval : DefaultAPIEval;

    for (let i = 0; i < this.envSecrets.length; i++) {
      const secret = this.envSecrets[i];
      if (!!body) {
        body = ReplaceAllOccurrences(body, secret.find, secret.replace);
      }
      if (!!url) {
        url = ReplaceAllOccurrences(url, secret.find, secret.replace);
      }
      if (!!headers) {
        headers = ReplaceAllOccurrences(headers, secret.find, secret.replace);
      }
    }

    if (!!headers) {
      try {
        headers = JSON.parse(headers);
        headers = headers.reduce((acc, header) => {
          acc[header.key] = header.value;
          return acc;
        }, {});
        axiosHeaders = { ...axiosHeaders, ...headers };
      } catch (e) {
        console.log(e);
      }
    }

    const options = {
      method: method,
      headers: axiosHeaders,
      timeout: timeout,
      transformResponse: (r) => r,
    };

    if (!!this.monitor.type_data.allowSelfSignedCert) {
      options.httpsAgent = new https.Agent({ rejectUnauthorized: false });
    }

    if (!!body) {
      options.data = body;
    }
    let statusCode = 500;
    let latency = 0;
    let resp = "";
    let timeoutError = false;
    const start = Date.now();
    try {
      let data = await axios(url, options);
      statusCode = data.status;
      resp = data.data;
    } catch (err) {
      console.log(`Error in apiCall ${tag}`, err.message);
      if (err.message.startsWith("timeout of") && err.message.endsWith("exceeded")) {
        timeoutError = true;
      }
      if (err.response !== undefined && err.response.status !== undefined) {
        statusCode = err.response.status;
      }
      if (err.response !== undefined && err.response.data !== undefined) {
        resp = err.response.data;
      } else {
        resp = JSON.stringify(resp);
      }
    } finally {
      const end = Date.now();
      latency = end - start;
      if (resp === undefined || resp === null) {
        resp = "";
      }
    }

    let evalResp = undefined;
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
    } catch (error) {
      console.log(`Error in monitorEval for ${tag}`, error.message);
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

    let toWrite = {
      status: DOWN,
      latency: latency,
      type: ERROR,
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

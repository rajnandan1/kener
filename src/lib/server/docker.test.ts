import { afterEach, describe, expect, it } from "vitest";
import { buildBaseURL, buildRequestConfig, containerDisplayName, DockerError, resolveConnection } from "./docker";
import type { DockerConnection } from "./docker";

function connection(daemon: string, connectionType: DockerConnection["connectionType"] = "tcp"): DockerConnection {
  return { connectionType, daemon };
}

describe("buildBaseURL", () => {
  it("keeps an explicit port on a bare host:port", () => {
    expect(buildBaseURL(connection("10.0.0.5:2375"))).toBe("http://10.0.0.5:2375");
  });

  it("adds the default tcp port when none is given", () => {
    expect(buildBaseURL(connection("10.0.0.5"))).toBe("http://10.0.0.5:2375");
  });

  it("adds the default tls port and uses https", () => {
    expect(buildBaseURL(connection("docker.example.com", "tls"))).toBe("https://docker.example.com:2376");
  });

  it.each(["tcp://", "http://", "HTTP://", "https://"])("strips the %s scheme", (scheme) => {
    expect(buildBaseURL(connection(`${scheme}10.0.0.5:2375`))).toBe("http://10.0.0.5:2375");
  });

  // Regression: a trailing slash used to hide the port, producing host:2375/:2375
  it("strips a trailing slash before detecting the port", () => {
    expect(buildBaseURL(connection("tcp://docker-host:2375/"))).toBe("http://docker-host:2375");
  });

  it("strips repeated trailing slashes and still defaults the port", () => {
    expect(buildBaseURL(connection("tcp://docker-host///"))).toBe("http://docker-host:2375");
  });

  it("trims surrounding whitespace", () => {
    expect(buildBaseURL(connection("  10.0.0.5:2375  "))).toBe("http://10.0.0.5:2375");
  });

  it("throws when the address is empty", () => {
    expect(() => buildBaseURL(connection("   "))).toThrow(DockerError);
    expect(() => buildBaseURL(connection("tcp://"))).toThrow("Docker host address is empty");
  });
});

describe("resolveConnection", () => {
  afterEach(() => {
    delete process.env.KENER_TEST_DOCKER_HOST;
    delete process.env.KENER_TEST_DOCKER_KEY;
  });

  it("substitutes $SECRET references from the environment", () => {
    process.env.KENER_TEST_DOCKER_HOST = "10.0.0.5:2376";
    process.env.KENER_TEST_DOCKER_KEY = "-----BEGIN PRIVATE KEY-----";
    expect(
      resolveConnection({
        connectionType: "tls",
        daemon: "$KENER_TEST_DOCKER_HOST",
        tlsCert: "cert-pem",
        tlsKey: "$KENER_TEST_DOCKER_KEY",
      }),
    ).toEqual({
      connectionType: "tls",
      daemon: "10.0.0.5:2376",
      tlsCa: undefined,
      tlsCert: "cert-pem",
      tlsKey: "-----BEGIN PRIVATE KEY-----",
    });
  });

  it("leaves an unknown $SECRET untouched and trims the fields", () => {
    expect(resolveConnection({ connectionType: "socket", daemon: " $KENER_NOPE_SOCK " })).toMatchObject({
      daemon: "$KENER_NOPE_SOCK",
    });
  });

  it("drops empty TLS fields so they do not reach the https agent", () => {
    const resolved = resolveConnection({ connectionType: "tls", daemon: "h", tlsCa: "  ", tlsCert: "", tlsKey: "" });
    expect(resolved.tlsCa).toBeUndefined();
    expect(resolved.tlsCert).toBeUndefined();
    expect(resolved.tlsKey).toBeUndefined();
  });

  it("coerces non-string fields instead of throwing", () => {
    expect(resolveConnection({ connectionType: "socket", daemon: 123 as never, tlsKey: null as never })).toMatchObject({
      daemon: "123",
      tlsKey: undefined,
    });
  });

  // Regression: an object with a null toString made Object.values(...).join() throw before substitution.
  it("treats object-valued fields as empty", () => {
    const hostile = { toString: null } as never;
    expect(resolveConnection({ connectionType: "socket", daemon: "/var/run/docker.sock", tlsCa: hostile })).toEqual({
      connectionType: "socket",
      daemon: "/var/run/docker.sock",
      tlsCa: undefined,
      tlsCert: undefined,
      tlsKey: undefined,
    });
    const emptied = resolveConnection({ connectionType: "socket", daemon: hostile });
    expect(emptied.daemon).toBe("");
    expect(() => buildRequestConfig(emptied, "/_ping", 1000)).toThrow("Docker socket path is empty");
  });

  it("rejects an unknown connection type", () => {
    expect(() => resolveConnection({ connectionType: "ssh" as never, daemon: "h" })).toThrow(DockerError);
    expect(() => resolveConnection(undefined)).toThrow("must be one of: socket, tcp, tls");
  });
});

describe("buildRequestConfig", () => {
  it("uses socketPath for socket connections", () => {
    const config = buildRequestConfig(connection("/var/run/docker.sock", "socket"), "/_ping", 1000);
    expect(config.socketPath).toBe("/var/run/docker.sock");
    expect(config.baseURL).toBe("http://localhost");
    expect(config.timeout).toBe(1000);
  });

  it("throws when the socket path is empty", () => {
    expect(() => buildRequestConfig(connection("", "socket"), "/_ping", 1000)).toThrow("Docker socket path is empty");
  });

  it("requires the client certificate and key together", () => {
    expect(() => buildRequestConfig({ ...connection("h", "tls"), tlsCert: "c" }, "/_ping", 1000)).toThrow("together");
    expect(() => buildRequestConfig({ ...connection("h", "tls"), tlsKey: "k" }, "/_ping", 1000)).toThrow("together");
  });

  it("attaches an https agent for tls, with or without a client certificate", () => {
    const withCert = buildRequestConfig({ ...connection("h", "tls"), tlsCert: "c", tlsKey: "k" }, "/_ping", 1000);
    expect(withCert.baseURL).toBe("https://h:2376");
    expect(withCert.httpsAgent).toBeDefined();
    expect(buildRequestConfig(connection("h", "tls"), "/_ping", 1000).httpsAgent).toBeDefined();
  });

  it("does not attach an https agent for plain tcp", () => {
    expect(buildRequestConfig(connection("h"), "/_ping", 1000).httpsAgent).toBeUndefined();
  });
});

describe("containerDisplayName", () => {
  it("strips Docker's leading slash", () => {
    expect(containerDisplayName(["/kener-app"])).toBe("kener-app");
  });

  it("returns an empty string when there are no names", () => {
    expect(containerDisplayName([])).toBe("");
    expect(containerDisplayName(undefined)).toBe("");
  });
});

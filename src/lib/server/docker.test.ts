import { describe, expect, it } from "vitest";
import { buildBaseURL, containerDisplayName, DockerError } from "./docker";
import type { DockerConnection } from "./docker";

function connection(daemon: string, connection_type: DockerConnection["connection_type"] = "tcp"): DockerConnection {
  return { connection_type, daemon, tls_ca: null, tls_cert: null, tls_key: null };
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

describe("containerDisplayName", () => {
  it("strips Docker's leading slash", () => {
    expect(containerDisplayName(["/kener-app"])).toBe("kener-app");
  });

  it("returns an empty string when there are no names", () => {
    expect(containerDisplayName([])).toBe("");
    expect(containerDisplayName(undefined)).toBe("");
  });
});

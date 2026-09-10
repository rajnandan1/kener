import GC from "../../global-constants.js";
import { DOCKER_DEFAULT_TIMEOUT } from "../../anywhere.js";
import { DockerError, inspectContainer, pingDaemon, resolveConnection, type DockerContainerState } from "../docker.js";
import type { DockerMonitor, MonitoringResult } from "../types/monitor.js";

/**
 * DOCKER monitor.
 *
 * Two modes:
 *   daemon    → `GET /_ping`; UP when the Engine API answers.
 *   container → `GET /containers/{name}/json`; the container's state and, when it
 *               declares a HEALTHCHECK, its health status decide the monitor status.
 *
 * The connection lives in the monitor's type_data like every other monitor type.
 * `$SECRET` references in it are resolved from the environment on every run.
 *
 * Latency is the round-trip time of the Docker API call, which is what makes the
 * latency chart meaningful for this type: it tracks daemon responsiveness.
 */
class DockerCall {
  monitor: DockerMonitor;

  constructor(monitor: DockerMonitor) {
    this.monitor = monitor;
  }

  async execute(): Promise<MonitoringResult> {
    const tag = this.monitor.tag;
    const typeData = this.monitor.type_data;
    const timeout = typeData?.timeout && typeData.timeout > 0 ? typeData.timeout : DOCKER_DEFAULT_TIMEOUT;
    const checkType = typeData?.checkType === "daemon" ? "daemon" : "container";
    const containerName = (typeData?.containerName || "").trim();

    if (checkType === "container" && !containerName) {
      return this.failure(`No container configured for monitor ${tag}`);
    }

    try {
      const connection = resolveConnection(typeData);

      if (checkType === "daemon") {
        const { data, latency } = await pingDaemon(connection, timeout);
        // The Engine answers `/_ping` with a bare "OK". Anything else is a proxy,
        // a login page, or a redirect standing in front of the daemon, not the daemon.
        if (String(data).trim() !== "OK") {
          return this.failure("Docker daemon returned an unexpected /_ping response");
        }
        return { status: GC.UP, latency, type: GC.REALTIME };
      }

      const { data, latency } = await inspectContainer(connection, containerName, timeout);
      return { ...evaluateState(data.State), latency, type: GC.REALTIME };
    } catch (error: unknown) {
      if (error instanceof DockerError) {
        // 404 means the daemon is reachable but the container is gone. Still DOWN,
        // but the operator needs a message that distinguishes it from a dead daemon.
        // The raw daemon field is used on purpose: it may hold a $SECRET reference.
        const message =
          error.statusCode === 404 && checkType === "container"
            ? `Container "${containerName}" not found on ${typeData?.daemon}`
            : error.message;
        return {
          status: GC.DOWN,
          latency: 0,
          type: error.isTimeout ? GC.TIMEOUT : GC.ERROR,
          error_message: message,
        };
      }
      const message = error instanceof Error ? error.message : String(error);
      console.log(`Error in docker monitor ${tag}:`, message);
      return this.failure(message);
    }
  }

  /** Configuration problems are DOWN with the reason attached, never a silent NO_DATA. */
  private failure(message: string): MonitoringResult {
    return { status: GC.DOWN, latency: 0, type: GC.ERROR, error_message: message };
  }
}

/**
 * Maps Docker's container state onto a Kener status. One fixed rule, the same one
 * Uptime Kuma applies: transitional states (restarting, healthcheck still starting)
 * are DEGRADED; anything not serving (paused, stopped, unhealthy) is DOWN with the
 * reason in the message; a running container with no or a healthy HEALTHCHECK is UP.
 *
 * Restarting is checked first because Docker reports `Running: true` while a
 * container is in a restart loop.
 */
export function evaluateState(state: DockerContainerState): Pick<MonitoringResult, "status" | "error_message"> {
  if (state.Restarting) {
    return { status: GC.DEGRADED, error_message: "Container is restarting" };
  }
  if (state.Paused) {
    return { status: GC.DOWN, error_message: "Container is paused" };
  }
  if (!state.Running) {
    const detail = state.Error ? ` (${state.Error})` : "";
    return {
      status: GC.DOWN,
      error_message: `Container is ${state.Status} with exit code ${state.ExitCode}${detail}`,
    };
  }

  const health = state.Health?.Status;
  if (health === "unhealthy") {
    const lastOutput = state.Health?.Log?.at(-1)?.Output?.trim();
    const detail = lastOutput ? `: ${truncate(lastOutput, 200)}` : "";
    return {
      status: GC.DOWN,
      error_message: `Container healthcheck is unhealthy after ${state.Health?.FailingStreak ?? 0} failures${detail}`,
    };
  }
  if (health === "starting") {
    return { status: GC.DEGRADED, error_message: "Container healthcheck is still starting" };
  }

  return { status: GC.UP };
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

export default DockerCall;

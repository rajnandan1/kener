import GC from "../../global-constants.js";
import db from "../db/db.js";
import { DOCKER_DEFAULT_TIMEOUT } from "../../anywhere.js";
import { DockerError, inspectContainer, pingDaemon, type DockerContainerState } from "../docker.js";
import type { DockerMonitor, MonitoringResult } from "../types/monitor.js";
import type { DockerDegradableStatus } from "../../anywhere.js";

/**
 * DOCKER monitor.
 *
 * Two modes:
 *   daemon    → `GET /_ping`; UP when the Engine API answers.
 *   container → `GET /containers/{name}/json`; the container's state and, when it
 *               declares a HEALTHCHECK, its health status decide the monitor status.
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

    const hostId = Number(typeData?.dockerHostId);
    if (!hostId) {
      return this.failure(`No Docker host selected for monitor ${tag}`);
    }

    const dockerHost = await db.getDockerHostById(hostId);
    if (!dockerHost) {
      return this.failure(`Docker host ${hostId} no longer exists`);
    }

    const checkType = typeData.checkType === "daemon" ? "daemon" : "container";

    try {
      if (checkType === "daemon") {
        const { latency } = await pingDaemon(dockerHost, timeout);
        return { status: GC.UP, latency, type: GC.REALTIME };
      }

      const containerName = (typeData.containerName || "").trim();
      if (!containerName) {
        return this.failure(`No container configured for monitor ${tag}`);
      }

      const { data, latency } = await inspectContainer(dockerHost, containerName, timeout);
      return { ...this.evaluateState(data.State), latency, type: GC.REALTIME };
    } catch (error: unknown) {
      if (error instanceof DockerError) {
        // 404 means the daemon is reachable but the container is gone. Still DOWN,
        // but the operator needs a message that distinguishes it from a dead daemon.
        const message =
          error.statusCode === 404
            ? `Container "${typeData.containerName}" not found on ${dockerHost.name}`
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

  /** Maps Docker's container state onto a Kener status. */
  private evaluateState(state: DockerContainerState): Pick<MonitoringResult, "status" | "error_message"> {
    const typeData = this.monitor.type_data;
    const unhealthyStatus = this.degradableStatus(typeData.unhealthyStatus, GC.DOWN);
    const restartingStatus = this.degradableStatus(typeData.restartingStatus, GC.DEGRADED);
    const pausedStatus = this.degradableStatus(typeData.pausedStatus, GC.DOWN);

    if (state.Restarting) {
      return { status: restartingStatus, error_message: "Container is restarting" };
    }
    if (state.Paused) {
      return { status: pausedStatus, error_message: "Container is paused" };
    }
    if (!state.Running) {
      const detail = state.Error ? ` (${state.Error})` : "";
      return {
        status: GC.DOWN,
        error_message: `Container is ${state.Status} with exit code ${state.ExitCode}${detail}`,
      };
    }

    // Running. If the image declares a HEALTHCHECK, defer to it.
    const health = state.Health?.Status;
    if (health === "unhealthy") {
      const lastOutput = state.Health?.Log?.at(-1)?.Output?.trim();
      const detail = lastOutput ? `: ${truncate(lastOutput, 200)}` : "";
      return {
        status: unhealthyStatus,
        error_message: `Container healthcheck is unhealthy after ${state.Health?.FailingStreak ?? 0} failures${detail}`,
      };
    }
    if (health === "starting") {
      return { status: GC.DEGRADED, error_message: "Container healthcheck is still starting" };
    }

    return { status: GC.UP };
  }

  private degradableStatus(value: DockerDegradableStatus | undefined, fallback: string): string {
    return value === "DEGRADED" || value === "DOWN" ? value : fallback;
  }

  /** Configuration problems are DOWN with the reason attached, never a silent NO_DATA. */
  private failure(message: string): MonitoringResult {
    return { status: GC.DOWN, latency: 0, type: GC.ERROR, error_message: message };
  }
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

export default DockerCall;

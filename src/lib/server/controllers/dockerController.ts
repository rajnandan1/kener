import { containerDisplayName, listContainers, resolveConnection } from "../docker.js";
import type { DockerMonitorTypeData } from "../types/monitor.js";

export interface DockerContainerOption {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
}

/**
 * Container picker for the DOCKER monitor editor. Takes the monitor's unsaved
 * connection fields straight from the form, so nothing has to be saved before
 * browsing. `$SECRET` references are resolved server-side like in the monitor run.
 */
export const ListDockerContainers = async (
  typeData: Partial<DockerMonitorTypeData>,
): Promise<DockerContainerOption[]> => {
  const timeout = typeData.timeout && typeData.timeout > 0 ? typeData.timeout : undefined;
  const { data } = await listContainers(resolveConnection(typeData), timeout);
  return data.map((container) => ({
    id: container.Id.slice(0, 12),
    name: containerDisplayName(container.Names),
    image: container.Image,
    state: container.State,
    status: container.Status,
  }));
};
